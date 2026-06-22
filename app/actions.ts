"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { getOrderByCode } from "@/lib/db";
import { sendOrderCreatedEmail, sendStatusEmail } from "@/lib/email";
import {
  HOME_COLLECTION_FEE,
  isCustomQuoteBand,
  volumetricWeight,
  chargeableWeight,
  bandForWeight,
  type Country,
  type DeliveryOption,
  type Order,
  type OrderStatus,
  type ParcelCategory,
  type PaymentStatus,
} from "@/lib/data";

export interface CreateOrderInput {
  origin: Country;
  destination: Country;
  delivery: DeliveryOption;
  category?: ParcelCategory;
  recipient: { name: string; phone: string; address: string };
  parcel: {
    actualWeight: number;
    length: number;
    width: number;
    height: number;
    description: string;
    declaredValue: number;
  };
  dropoffPoint?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const user = await getSessionUser();
  if (!user) return { error: "Veuillez vous connecter pour réserver un envoi." };

  const db = supabaseAdmin();

  // Compute the chargeable weight server-side, then derive the pricing band —
  // so the price can't be tampered with from the client.
  const volumetric = volumetricWeight(input.parcel.length, input.parcel.width, input.parcel.height);
  const chargeable = chargeableWeight(input.parcel.actualWeight, volumetric);
  const band = bandForWeight(chargeable);
  const dimensions = `${input.parcel.length}×${input.parcel.width}×${input.parcel.height} cm`;
  const customQuote = isCustomQuoteBand(band);

  // Parcels above 25 kg have no grid price: store the order with total 0 ("à
  // devis") so the team can quote it manually and contact the customer.
  // Otherwise take the authoritative price from the DB, not from the client.
  let total = 0;
  if (!customQuote) {
    const { data: rule, error: ruleErr } = await db
      .from("pricing_rules")
      .select("base_price")
      .eq("origin", input.origin)
      .eq("destination", input.destination)
      .eq("band", band)
      .single();
    if (ruleErr || !rule) return { error: "Aucun tarif trouvé pour ce trajet." };

    const optionsFee = input.delivery === "Home collection" ? HOME_COLLECTION_FEE : 0;
    total = Math.round((Number(rule.base_price) + optionsFee) * 100) / 100;
  }

  // Sequential YonelMa parcel reference: YNM-2026-0001, 0002, …
  // One reference is used as both the order number and the tracking number,
  // so it's the single code shared with E-Logik / TAF / PAPS and the customer.
  const year = new Date().getFullYear();
  const prefix = `YNM-${year}-`;
  const { data: last } = await db
    .from("orders")
    .select("order_number")
    .like("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  let seq = last?.order_number
    ? parseInt(String(last.order_number).slice(prefix.length), 10) + 1
    : 1;

  // Retry on the (unlikely) chance of a concurrent collision.
  // Optional columns (dropoff_point, parcel_category, chargeable_weight) are
  // included only if present; we gracefully fall back if they haven't been
  // added to the table yet (see supabase/migration-extra-columns.sql).
  let includeExtras = true;

  for (let attempt = 0; attempt < 6; attempt++) {
    const reference = `${prefix}${String(seq).padStart(4, "0")}`;
    const row: Record<string, unknown> = {
      order_number: reference,
      tracking_number: reference,
      customer_name: user.name,
      customer_email: user.email,
      origin: input.origin,
      destination: input.destination,
      band,
      delivery: input.delivery,
      insurance: false,
      recipient_name: input.recipient.name,
      recipient_phone: input.recipient.phone,
      recipient_address: input.recipient.address,
      parcel_weight: input.parcel.actualWeight,
      parcel_description: input.parcel.description,
      parcel_declared_value: input.parcel.declaredValue,
      parcel_dimensions: dimensions,
      total,
    };
    if (includeExtras) {
      if (input.dropoffPoint) row.dropoff_point = input.dropoffPoint;
      if (input.category) row.parcel_category = input.category;
      row.chargeable_weight = chargeable;
    }

    const { data: created, error } = await db
      .from("orders")
      .insert(row)
      .select("id")
      .single();

    if (!error && created) {
      await db.from("status_log").insert({
        order_id: created.id,
        status: "Order Created",
        by_who: user.name,
        note: customQuote ? "Devis personnalisé demandé (colis > 25 kg)" : null,
      });
      void sendOrderCreatedEmail(user.email, user.name, reference);
      revalidatePath("/dashboard");
      revalidatePath("/shipments");
      revalidatePath("/admin");
      return {
        id: created.id as string,
        orderNumber: reference,
        trackingNumber: reference,
        total,
      };
    }
    // Reference already taken (concurrent booking) → try the next number.
    if (error && error.code === "23505") {
      seq++;
      continue;
    }
    // Optional column not added yet → retry without the extras (same number).
    if (
      error &&
      (error.code === "PGRST204" ||
        /dropoff_point|parcel_category|chargeable_weight/.test(error.message))
    ) {
      includeExtras = false;
      continue;
    }
    if (error) return { error: error.message };
  }
  return { error: "Impossible de générer une référence unique — réessayez." };
}

export async function updateOrderAdmin(
  id: string,
  patch: {
    status: OrderStatus;
    payment: PaymentStatus;
    partner: string | null;
    total?: number;
    note?: string;
  },
) {
  const db = supabaseAdmin();
  const { data: before, error: readErr } = await db
    .from("orders")
    .select("status, customer_email, customer_name, order_number")
    .eq("id", id)
    .single();
  if (readErr) return { error: readErr.message };

  const update: Record<string, unknown> = {
    status: patch.status,
    payment: patch.payment,
    partner: patch.partner || null,
  };
  // Allow setting/adjusting the price (e.g. quoting a >25 kg custom order).
  if (typeof patch.total === "number" && patch.total >= 0) {
    update.total = Math.round(patch.total * 100) / 100;
  }

  const { error } = await db.from("orders").update(update).eq("id", id);
  if (error) return { error: error.message };

  if (before.status !== patch.status || patch.note) {
    await db.from("status_log").insert({
      order_id: id,
      status: patch.status,
      by_who: "Admin (Paris hub)",
      note: patch.note || null,
    });
  }
  if (before.status !== patch.status) {
    void sendStatusEmail(before.customer_email, before.customer_name, before.order_number, patch.status);
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath(`/shipments/${id}`);
  return { ok: true };
}

export async function advanceStatus(id: string, next: OrderStatus, by: string) {
  const db = supabaseAdmin();
  const { error } = await db.from("orders").update({ status: next }).eq("id", id);
  if (error) return { error: error.message };
  await db.from("status_log").insert({ order_id: id, status: next, by_who: by });
  const { data: o } = await db
    .from("orders")
    .select("customer_email, customer_name, order_number")
    .eq("id", id)
    .single();
  if (o) void sendStatusEmail(o.customer_email, o.customer_name, o.order_number, next);
  revalidatePath("/partner");
  revalidatePath(`/partner/orders/${id}`);
  revalidatePath(`/shipments/${id}`);
  return { ok: true };
}

export async function reportIncident(id: string, note: string, by: string) {
  const db = supabaseAdmin();
  const { data: order, error: readErr } = await db
    .from("orders")
    .select("order_number, customer_name")
    .eq("id", id)
    .single();
  if (readErr) return { error: readErr.message };

  const { error } = await db.from("orders").update({ incident: true }).eq("id", id);
  if (error) return { error: error.message };

  await db.from("status_log").insert({
    order_id: id,
    status: "Incident reported",
    by_who: by,
    note,
  });
  await db.from("claims").insert({
    order_number: order.order_number,
    customer: order.customer_name,
    type: "Delivery issue",
    status: "Open",
    detail: note,
  });
  revalidatePath("/partner");
  revalidatePath("/admin/claims");
  return { ok: true };
}

export async function updateClaim(
  id: number,
  status: "Resolved" | "Refunded",
) {
  const db = supabaseAdmin();
  const { data: claim, error: readErr } = await db
    .from("claims")
    .select("order_number")
    .eq("id", id)
    .single();
  if (readErr) return { error: readErr.message };

  const { error } = await db.from("claims").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  if (status === "Refunded") {
    await db
      .from("orders")
      .update({ payment: "Refunded" })
      .eq("order_number", claim.order_number);
  }
  revalidatePath("/admin/claims");
  return { ok: true };
}

export async function trackByCode(code: string): Promise<Order | null> {
  if (!code.trim()) return null;
  return getOrderByCode(code);
}

export async function loginAdmin(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD;

  if (username === adminUser && password === adminPass) {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });
    return { success: true };
  }

  return { error: "Identifiant ou mot de passe incorrect" };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}


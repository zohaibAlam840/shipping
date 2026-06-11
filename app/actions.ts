"use server";

// Server actions: every write the app does goes through here.
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrderByCode } from "@/lib/db";
import {
  HOME_COLLECTION_FEE,
  INSURANCE_RATE,
  ME,
  type Country,
  type DeliveryOption,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type WeightBand,
} from "@/lib/data";

function randomCode(len: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export interface CreateOrderInput {
  origin: Country;
  destination: Country;
  band: WeightBand;
  delivery: DeliveryOption;
  insurance: boolean;
  recipient: { name: string; phone: string; address: string };
  parcel: { weight: number; description: string; declaredValue: number; dimensions: string };
}

export async function createOrder(input: CreateOrderInput) {
  const db = supabaseAdmin();

  // Authoritative price from the DB, not from the client.
  const { data: rule, error: ruleErr } = await db
    .from("pricing_rules")
    .select("base_price")
    .eq("origin", input.origin)
    .eq("destination", input.destination)
    .eq("band", input.band)
    .single();
  if (ruleErr || !rule) return { error: "No price found for this route." };

  const optionsFee =
    (input.delivery === "Home collection" ? HOME_COLLECTION_FEE : 0) +
    (input.insurance ? Math.round(input.parcel.declaredValue * INSURANCE_RATE * 100) / 100 : 0);
  const total = Math.round((Number(rule.base_price) + optionsFee) * 100) / 100;

  // Retry a couple of times in case a random number collides.
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = `YM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const trackingNumber = `YMT-${randomCode(6)}`;
    const { data: created, error } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        tracking_number: trackingNumber,
        customer_name: ME.name,
        customer_email: ME.email,
        origin: input.origin,
        destination: input.destination,
        band: input.band,
        delivery: input.delivery,
        insurance: input.insurance,
        recipient_name: input.recipient.name,
        recipient_phone: input.recipient.phone,
        recipient_address: input.recipient.address,
        parcel_weight: input.parcel.weight,
        parcel_description: input.parcel.description,
        parcel_declared_value: input.parcel.declaredValue,
        parcel_dimensions: input.parcel.dimensions,
        total,
      })
      .select("id")
      .single();

    if (!error && created) {
      await db.from("status_log").insert({
        order_id: created.id,
        status: "Pending Confirmation",
        by_who: ME.name,
      });
      revalidatePath("/dashboard");
      revalidatePath("/shipments");
      revalidatePath("/admin");
      return { id: created.id as string, orderNumber, trackingNumber, total };
    }
    if (error && error.code !== "23505") return { error: error.message };
  }
  return { error: "Could not generate a unique order number — try again." };
}

export async function updateOrderAdmin(
  id: string,
  patch: {
    status: OrderStatus;
    payment: PaymentStatus;
    partner: string | null;
    note?: string;
  },
) {
  const db = supabaseAdmin();
  const { data: before, error: readErr } = await db
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();
  if (readErr) return { error: readErr.message };

  const { error } = await db
    .from("orders")
    .update({
      status: patch.status,
      payment: patch.payment,
      partner: patch.partner || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  if (before.status !== patch.status || patch.note) {
    await db.from("status_log").insert({
      order_id: id,
      status: patch.status,
      by_who: "Admin (Paris hub)",
      note: patch.note || null,
    });
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

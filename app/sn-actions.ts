"use server";

// Senegal domestic booking (spec §4, SN-NAT-01…05, founder answers 1, 2, 5, 6).
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { getAppUser } from "@/lib/roles";
import { recordEvent } from "@/lib/ledger";
import { newPickupCode } from "@/lib/pickup-code";
import { nextParcelRefs, getPickupCodesForOrder } from "@/lib/parcels";
import { getRelayById } from "@/lib/relays";
import { quoteDomestic, scheduleForDropoff, toISODate, serviceTypeFor } from "@/lib/sn-domain";
import { sendOrderCreatedEmail } from "@/lib/email";
import { dispatchPickupCode, anyDelivered } from "@/lib/notifications";
import type { ActionResult } from "@/app/actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CollectionMode = "relay_dropoff" | "home_pickup";
export type DeliveryMode = "relay_pickup" | "home_delivery";

export interface ParcelInput {
  weightKg: number;
  length?: number;
  width?: number;
  height?: number;
  contents: string;
  declaredValue?: number;
}

export interface DomesticBookingInput {
  recipient: { name: string; phone: string; email?: string; address?: string };
  senderPhone?: string;
  collectionMode: CollectionMode;
  deliveryMode: DeliveryMode;
  originRelayId?: string;
  destinationRelayId?: string;
  parcels: ParcelInput[];
}

/** Public, non-sensitive summary of a created booking. */
export interface DomesticBookingResult extends ActionResult {
  orderId?: string;
  orderNumber?: string;
  trackingNumber?: string;
  total?: number;
  currency?: string;
  parcelRefs?: string[];
  /** True when a parcel fell outside the price grid and needs a manual quote. */
  needsQuote?: boolean;
  transportDate?: string | null;
  deliveryFrom?: string | null;
  deliveryTo?: string | null;
}

const TRACK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newTrackingNumber(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = "";
  for (const b of bytes) code += TRACK_ALPHABET[b % TRACK_ALPHABET.length];
  return `YMT-${code}`;
}

/**
 * Create a Senegal domestic booking.
 *
 * Every price is computed on the server from the administrator's rules, never
 * taken from the client. Each parcel gets its own reference, QR token and
 * one-time pickup code (founder answers 1 and 2).
 */
export async function createDomesticOrder(
  input: DomesticBookingInput,
): Promise<DomesticBookingResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Veuillez vous connecter pour réserver un envoi." };

  if (!input.parcels?.length) return { error: "Ajoutez au moins un colis." };
  if (input.parcels.some((p) => !(p.weightKg > 0))) {
    return { error: "Chaque colis doit avoir un poids supérieur à zéro." };
  }
  if (!input.recipient.name?.trim() || !input.recipient.phone?.trim()) {
    return { error: "Le nom et le téléphone du destinataire sont obligatoires." };
  }
  if (input.collectionMode === "relay_dropoff" && !input.originRelayId) {
    return { error: "Choisissez le point relais de dépôt." };
  }
  if (input.deliveryMode === "relay_pickup" && !input.destinationRelayId) {
    return { error: "Choisissez le point relais de retrait." };
  }
  if (input.deliveryMode === "home_delivery" && !input.recipient.address?.trim()) {
    return { error: "L'adresse de livraison est obligatoire pour une livraison à domicile." };
  }

  const db = supabaseAdmin();
  const serviceType = serviceTypeFor(input.collectionMode, input.deliveryMode);

  // Relays must be bookable: operationally active AND commercially open. This
  // is what keeps Thiès usable for demonstration but out of real bookings.
  const [originRelay, destRelay] = await Promise.all([
    input.originRelayId ? getRelayById(input.originRelayId) : Promise.resolve(null),
    input.destinationRelayId ? getRelayById(input.destinationRelayId) : Promise.resolve(null),
  ]);

  for (const [relay, label] of [
    [originRelay, "de dépôt"],
    [destRelay, "de retrait"],
  ] as const) {
    if (!relay) continue;
    if (relay.status !== "active" || relay.commercialStatus !== "active") {
      return { error: `Le point relais ${label} n'est pas disponible à la réservation.` };
    }
  }

  const originZoneId = originRelay?.zoneId ?? destRelay?.zoneId ?? null;
  const destinationZoneId = destRelay?.zoneId ?? originRelay?.zoneId ?? null;
  if (!originZoneId || !destinationZoneId) {
    return { error: "Zone tarifaire introuvable pour ce trajet." };
  }

  // Price each parcel on its own weight, then sum (uniform regional model).
  let total = 0;
  let currency = "XOF";
  // A parcel heavier than the heaviest configured band has no grid price.
  // Rather than refusing the booking, the order is recorded "sur devis" with
  // a zero total so the team can quote it — the same convention the
  // France → Sénégal route already uses for parcels above 25 kg.
  let needsQuote = false;
  for (const p of input.parcels) {
    const quote = await quoteDomestic({
      originZoneId,
      destinationZoneId,
      serviceType,
      weightKg: p.weightKg,
    });
    if (!quote) {
      needsQuote = true;
      continue;
    }
    total += quote.price;
    currency = quote.currency;
  }
  if (needsQuote) total = 0;

  // When the parcels actually move, and the window quoted to the customer.
  const plan = await scheduleForDropoff(new Date(), input.originRelayId);

  // Sequential order reference; the tracking number stays unguessable.
  const year = new Date().getFullYear();
  const prefix = `YNM-${year}-`;
  const { data: last } = await db
    .from("orders")
    .select("order_number")
    .like("order_number", `${prefix}%`)
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  let seq = (last as any)?.order_number
    ? parseInt(String((last as any).order_number).slice(prefix.length), 10) + 1
    : 1;

  const heaviest = Math.max(...input.parcels.map((p) => p.weightKg));
  const deliveryLabel =
    input.deliveryMode === "relay_pickup" ? "Relay point" : "Home collection";
  const recipientAddress =
    input.deliveryMode === "home_delivery"
      ? input.recipient.address!.trim()
      : `Point relais : ${destRelay?.name ?? ""}, ${destRelay?.address ?? ""}`;

  let orderId = "";
  let orderNumber = "";
  let tracking = "";

  for (let attempt = 0; attempt < 6; attempt++) {
    orderNumber = `${prefix}${String(seq).padStart(4, "0")}`;
    tracking = newTrackingNumber();

    const row: Record<string, unknown> = {
      order_number: orderNumber,
      tracking_number: tracking,
      customer_name: user.name,
      customer_email: user.email,
      origin: "Senegal",
      destination: "Senegal",
      route_type: "SN_SN",
      band: `${heaviest} kg`,
      delivery: deliveryLabel,
      insurance: false,
      recipient_name: input.recipient.name.trim(),
      recipient_phone: input.recipient.phone.trim(),
      recipient_email: input.recipient.email?.trim() || null,
      recipient_address: recipientAddress,
      sender_phone: input.senderPhone?.trim() || null,
      parcel_weight: heaviest,
      parcel_description: input.parcels.map((p) => p.contents).filter(Boolean).join(" / "),
      parcel_declared_value: input.parcels.reduce((s, p) => s + (p.declaredValue ?? 0), 0),
      service_type: serviceType,
      collection_mode: input.collectionMode,
      delivery_mode: input.deliveryMode,
      origin_zone_id: originZoneId,
      destination_zone_id: destinationZoneId,
      origin_relay_id: input.originRelayId ?? null,
      destination_relay_id: input.destinationRelayId ?? null,
      origin_town: originRelay?.town ?? null,
      destination_town: destRelay?.town ?? null,
      parcel_count: input.parcels.length,
      currency,
      total,
      scheduled_transport_date: plan.transportDate ? toISODate(plan.transportDate) : null,
      estimated_delivery_from: plan.deliveryFrom ? toISODate(plan.deliveryFrom) : null,
      estimated_delivery_to: plan.deliveryTo ? toISODate(plan.deliveryTo) : null,
      status: "Order Created",
      payment: "Unpaid",
    };

    const { data: created, error } = await db.from("orders").insert(row).select("id").single();
    if (!error && created) {
      orderId = created.id as string;
      break;
    }
    if (error?.code === "23505") {
      seq++;
      continue;
    }
    if (error) return { error: error.message };
  }
  if (!orderId) return { error: "Impossible de générer une référence unique — réessayez." };

  // One row per parcel: own reference, own QR token (database default), own
  // pickup code, own status and history (founder answer 1).
  const refs = await nextParcelRefs(input.parcels.length);
  const parcelRows = input.parcels.map((p, i) => {
    const { hash, encrypted } = newPickupCode();
    const dims =
      p.length && p.width && p.height ? `${p.length}×${p.width}×${p.height} cm` : null;
    return {
      parcel_ref: refs[i],
      order_id: orderId,
      seq: i + 1,
      weight_kg: p.weightKg,
      dimensions: dims,
      declared_contents: p.contents?.trim() || null,
      declared_value: p.declaredValue ?? 0,
      status: "Booked",
      destination_relay_id: input.destinationRelayId ?? null,
      pickup_code_hash: hash,
      pickup_code_enc: encrypted,
    };
  });

  const { data: createdParcels, error: parcelErr } = await db
    .from("parcels")
    .insert(parcelRows)
    .select("id, parcel_ref");
  if (parcelErr) return { error: parcelErr.message };

  const actor = { userId: user.id, name: user.name, role: "customer" as const, isStaff: false };
  void recordEvent({
    actor,
    eventType: "order.created",
    orderId,
    resultingStatus: "Booked",
    source: "declared",
  });
  for (const p of createdParcels ?? []) {
    void recordEvent({
      actor,
      eventType: "parcel.created",
      orderId,
      parcelId: (p as any).id,
      resultingStatus: "Booked",
      source: "declared",
      relayId: input.originRelayId,
    });
  }

  if (needsQuote) {
    await db.from("status_log").insert({
      order_id: orderId,
      status: "Order Created",
      by_who: user.name,
      note: "Devis personnalisé requis — colis hors grille tarifaire",
    });
  }

  void sendOrderCreatedEmail(user.email, user.name, tracking);

  revalidatePath("/dashboard");
  revalidatePath("/shipments");
  revalidatePath("/admin");

  return {
    ok: true,
    orderId,
    orderNumber,
    trackingNumber: tracking,
    total,
    currency,
    parcelRefs: (createdParcels ?? []).map((p: any) => p.parcel_ref),
    needsQuote,
    transportDate: plan.transportDate ? toISODate(plan.transportDate) : null,
    deliveryFrom: plan.deliveryFrom ? toISODate(plan.deliveryFrom) : null,
    deliveryTo: plan.deliveryTo ? toISODate(plan.deliveryTo) : null,
  };
}

/**
 * Pickup codes for the sender's own order.
 *
 * Ownership is checked here, not by the caller: the codes are released only
 * to the customer who booked, or to staff. Never used by public tracking.
 */
export async function getMyPickupCodes(
  orderId: string,
): Promise<{ codes?: Record<string, string | null>; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Veuillez vous connecter." };

  const { data: order, error } = await supabaseAdmin()
    .from("orders")
    .select("customer_email")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!order) return { error: "Commande introuvable." };

  const appUser = await getAppUser();
  const isStaff = Boolean(appUser && appUser.role !== "customer");
  if ((order as any).customer_email !== user.email && !isStaff) {
    return { error: "Accès refusé." };
  }

  return { codes: await getPickupCodesForOrder(orderId) };
}

/**
 * Email the pickup code to the recipient.
 *
 * Called when a parcel becomes available for collection — the operational
 * moment the code is needed. No-op when no recipient address was supplied;
 * the sender can still pass the code on by hand (founder answer 2).
 */
export async function sendPickupCodeToRecipient(parcelId: string): Promise<ActionResult> {
  const db = supabaseAdmin();
  const { data: parcel, error } = await db
    .from("parcels")
    .select("id, parcel_ref, pickup_code_enc, destination_relay_id, order_id")
    .eq("id", parcelId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!parcel) return { error: "Colis introuvable." };

  const { data: order } = await db
    .from("orders")
    .select("recipient_name, recipient_email, recipient_phone")
    .eq("id", (parcel as any).order_id)
    .maybeSingle();

  const to = (order as any)?.recipient_email as string | undefined;
  if (!to) return { ok: true }; // no address: sender shares the code manually

  const { decryptPickupCode } = await import("@/lib/pickup-code");
  const code = decryptPickupCode((parcel as any).pickup_code_enc);
  if (!code) return { error: "Code de retrait indisponible." };

  const relay = (parcel as any).destination_relay_id
    ? await getRelayById((parcel as any).destination_relay_id)
    : null;

  // Goes through the configurable channel layer, so adding SMS or WhatsApp
  // later needs no change here (SN-NAT-06).
  const results = await dispatchPickupCode(
    {
      name: (order as any)?.recipient_name ?? "",
      email: to,
      phone: (order as any)?.recipient_phone ?? null,
    },
    {
      parcelRef: (parcel as any).parcel_ref,
      code,
      relayName: relay?.name ?? "",
      relayAddress: relay?.address ?? "",
      openingHours: relay
        ? Object.values(relay.openingHours).filter(Boolean).join(" · ")
        : undefined,
    },
  );

  if (anyDelivered(results)) {
    await db
      .from("parcels")
      .update({ pickup_code_sent_at: new Date().toISOString(), pickup_code_sent_to: to })
      .eq("id", parcelId);
    return { ok: true };
  }

  // Nothing went out — the sender still has the code in their account and can
  // pass it on, so this is reported, not treated as a failure of the scan.
  console.warn("[pickup-code] not delivered:", JSON.stringify(results));
  return { ok: true };
}

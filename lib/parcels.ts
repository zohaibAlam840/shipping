// Parcel data access (spec §10, founder answer 1 of 20 Nov 2026).
//
// One booking may carry several parcels for the same sender and recipient,
// and each parcel keeps its own identity: reference, QR token, weight,
// dimensions, status and scan history.
import { supabaseAdmin } from "@/lib/supabase";
import { decryptPickupCode } from "@/lib/pickup-code";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ParcelStatus =
  | "Booked"
  | "Accepted"
  | "In transit"
  | "Awaiting relay acceptance"
  | "Ready for pickup"
  | "Collected at relay"
  | "Delivered to address"
  | "Issue"
  | "Cancelled";

export const PARCEL_STATUS_FR: Record<ParcelStatus, string> = {
  Booked: "Réservé",
  Accepted: "Pris en charge",
  "In transit": "En transit",
  "Awaiting relay acceptance": "En attente d'acceptation par le relais",
  "Ready for pickup": "Disponible pour retrait",
  "Collected at relay": "Retiré par le destinataire",
  "Delivered to address": "Livré à domicile",
  Issue: "Incident",
  Cancelled: "Annulé",
};

/** Statuses the recipient can act on — used to decide when to send the code. */
export const READY_STATUSES: ParcelStatus[] = ["Ready for pickup"];

export interface Parcel {
  id: string;
  parcelRef: string;
  qrToken: string;
  orderId: string | null;
  seq: number;
  weightKg: number | null;
  dimensions: string | null;
  declaredContents: string | null;
  declaredValue: number;
  status: ParcelStatus;
  currentRelayId: string | null;
  destinationRelayId: string | null;
  routeId: string | null;
  pickupCodeSentAt: string | null;
  pickupCodeSentTo: string | null;
  pickupVerifiedAt: string | null;
  deliveredAt: string | null;
  deliveryAttempts: number;
  createdAt: string;
}

function toParcel(r: any): Parcel {
  return {
    id: r.id,
    parcelRef: r.parcel_ref,
    qrToken: r.qr_token,
    orderId: r.order_id ?? null,
    seq: r.seq ?? 1,
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    dimensions: r.dimensions ?? null,
    declaredContents: r.declared_contents ?? null,
    declaredValue: Number(r.declared_value ?? 0),
    status: (r.status ?? "Booked") as ParcelStatus,
    currentRelayId: r.current_relay_id ?? null,
    destinationRelayId: r.destination_relay_id ?? null,
    routeId: r.route_id ?? null,
    pickupCodeSentAt: r.pickup_code_sent_at ?? null,
    pickupCodeSentTo: r.pickup_code_sent_to ?? null,
    pickupVerifiedAt: r.pickup_verified_at ?? null,
    deliveredAt: r.delivered_at ?? null,
    deliveryAttempts: r.delivery_attempts ?? 0,
    createdAt: r.created_at,
  };
}

export async function getParcelsByOrder(orderId: string): Promise<Parcel[]> {
  const { data, error } = await supabaseAdmin()
    .from("parcels")
    .select("*")
    .eq("order_id", orderId)
    .order("seq", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toParcel);
}

/** Lookup by the opaque QR payload — the scanning entry point (SN-SCAN-01). */
export async function getParcelByToken(token: string): Promise<Parcel | null> {
  const { data, error } = await supabaseAdmin()
    .from("parcels")
    .select("*")
    .eq("qr_token", token.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? toParcel(data) : null;
}

export async function getParcelByRef(ref: string): Promise<Parcel | null> {
  const { data, error } = await supabaseAdmin()
    .from("parcels")
    .select("*")
    .eq("parcel_ref", ref.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toParcel(data) : null;
}

/**
 * Pickup codes for one order, in clear text.
 *
 * ONLY for the authenticated sender's own account or an administrator — the
 * caller must have checked ownership first. Never reachable from the public
 * tracking page (founder answer 2).
 */
export async function getPickupCodesForOrder(
  orderId: string,
): Promise<Record<string, string | null>> {
  const { data, error } = await supabaseAdmin()
    .from("parcels")
    .select("id, pickup_code_enc")
    .eq("order_id", orderId);
  if (error) throw error;
  const out: Record<string, string | null> = {};
  for (const row of data ?? []) {
    out[(row as any).id] = decryptPickupCode((row as any).pickup_code_enc);
  }
  return out;
}

/**
 * Next free parcel references, e.g. YM-SN-000128.
 *
 * Returns `count` consecutive references in one go so a multi-parcel booking
 * doesn't have to round-trip per parcel.
 */
export async function nextParcelRefs(count: number): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("parcels")
    .select("parcel_ref")
    .like("parcel_ref", "YM-SN-%")
    .order("parcel_ref", { ascending: false })
    .limit(1)
    .maybeSingle();

  const last = (data as any)?.parcel_ref as string | undefined;
  const start = last ? parseInt(last.replace("YM-SN-", ""), 10) + 1 : 1;
  const base = Number.isFinite(start) ? start : 1;
  return Array.from({ length: count }, (_, i) => `YM-SN-${String(base + i).padStart(6, "0")}`);
}

/** A parcel plus the few order fields the field screens display. */
export interface ParcelWithContext extends Parcel {
  orderNumber: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  relayName: string | null;
  destinationRelayName: string | null;
}

const CONTEXT_SELECT =
  "*, orders(order_number, recipient_name, recipient_phone, recipient_address)";

function toParcelWithContext(r: any, relayNames: Record<string, string>): ParcelWithContext {
  const base = toParcel(r);
  return {
    ...base,
    orderNumber: r.orders?.order_number ?? null,
    recipientName: r.orders?.recipient_name ?? null,
    recipientPhone: r.orders?.recipient_phone ?? null,
    recipientAddress: r.orders?.recipient_address ?? null,
    relayName: base.currentRelayId ? (relayNames[base.currentRelayId] ?? null) : null,
    destinationRelayName: base.destinationRelayId
      ? (relayNames[base.destinationRelayId] ?? null)
      : null,
  };
}

async function relayNameMap(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin().from("relays").select("id, name");
  return Object.fromEntries(((data ?? []) as any[]).map((r) => [r.id, r.name]));
}

/**
 * Parcels physically at a merchant's own shop (AT-02).
 *
 * An empty `relayIds` returns nothing rather than everything — a merchant
 * with no shop assigned must never see other shops' parcels.
 */
export async function getParcelsAtRelays(relayIds: string[]): Promise<ParcelWithContext[]> {
  if (relayIds.length === 0) return [];
  const [{ data, error }, names] = await Promise.all([
    supabaseAdmin()
      .from("parcels")
      .select(CONTEXT_SELECT)
      .in("current_relay_id", relayIds)
      .in("status", ["Awaiting relay acceptance", "Ready for pickup", "Issue"])
      .order("created_at", { ascending: true }),
    relayNameMap(),
  ]);
  if (error) throw error;
  return (data ?? []).map((r) => toParcelWithContext(r, names));
}

/** Parcels a driver still has to collect, move or deliver. */
export async function getParcelsForDriver(driverId?: string | null): Promise<ParcelWithContext[]> {
  const [{ data, error }, names] = await Promise.all([
    supabaseAdmin()
      .from("parcels")
      .select(CONTEXT_SELECT)
      .in("status", ["Booked", "Accepted", "In transit"])
      .order("created_at", { ascending: true }),
    relayNameMap(),
  ]);
  if (error) throw error;
  const all = (data ?? []).map((r) => toParcelWithContext(r, names));
  // Parcels already in this driver's hands come first.
  return all.sort((a, b) => {
    const mine = (p: ParcelWithContext) => ((p as any).holderUserId === driverId ? 0 : 1);
    return mine(a) - mine(b);
  });
}

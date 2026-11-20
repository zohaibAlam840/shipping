// Operations reporting for the administrator (spec §7, SN-TRK-02, SN-TRK-04).
import { supabaseAdmin } from "@/lib/supabase";
import type { ParcelStatus } from "@/lib/parcels";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** The five buckets the specification asks the dashboard to show. */
export type OpsBucket = "created" | "in_transit" | "at_relay" | "delivered" | "exception";

export const BUCKET_FR: Record<OpsBucket, string> = {
  created: "Créés",
  in_transit: "En transit",
  at_relay: "En point relais",
  delivered: "Livrés",
  exception: "Incidents",
};

const BUCKET_STATUSES: Record<OpsBucket, ParcelStatus[]> = {
  created: ["Booked"],
  in_transit: ["Accepted", "In transit"],
  at_relay: ["Awaiting relay acceptance", "Ready for pickup"],
  delivered: ["Collected at relay", "Delivered to address"],
  exception: ["Issue"],
};

export function bucketFor(status: ParcelStatus): OpsBucket | null {
  for (const [bucket, statuses] of Object.entries(BUCKET_STATUSES)) {
    if (statuses.includes(status)) return bucket as OpsBucket;
  }
  return null;
}

export interface OpsFilters {
  /** Parcel reference, order number, tracking number or recipient name. */
  q?: string;
  relayId?: string;
  zoneId?: string;
  status?: ParcelStatus | "All";
  /** ISO dates, inclusive. */
  from?: string;
  to?: string;
}

export interface OpsParcelRow {
  id: string;
  parcelRef: string;
  status: ParcelStatus;
  bucket: OpsBucket | null;
  weightKg: number | null;
  createdAt: string;
  deliveredAt: string | null;
  orderNumber: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  town: string | null;
  relayName: string | null;
  driverName: string | null;
}

/**
 * Parcels matching the administrator's filters, newest first.
 *
 * Search covers parcel, order, tracking number and recipient; filtering
 * covers relay, zone, status and date range (SN-TRK-02, SN-TRK-04).
 */
export async function searchParcels(filters: OpsFilters = {}): Promise<OpsParcelRow[]> {
  const db = supabaseAdmin();

  let query = db
    .from("parcels")
    .select(
      "id, parcel_ref, status, weight_kg, created_at, delivered_at, current_relay_id, destination_relay_id, delivered_by, orders(order_number, tracking_number, recipient_name, recipient_phone, destination_town, destination_zone_id)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.status && filters.status !== "All") query = query.eq("status", filters.status);
  if (filters.relayId) query = query.eq("current_relay_id", filters.relayId);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);

  const [{ data, error }, { data: relays }, { data: staff }] = await Promise.all([
    query,
    db.from("relays").select("id, name"),
    db.from("app_users").select("id, full_name"),
  ]);
  if (error) throw error;

  const relayName = Object.fromEntries(((relays ?? []) as any[]).map((r) => [r.id, r.name]));
  const staffName = Object.fromEntries(((staff ?? []) as any[]).map((u) => [u.id, u.full_name]));

  const needle = filters.q?.trim().toLowerCase();

  return ((data ?? []) as any[])
    .filter((p) => {
      if (filters.zoneId && p.orders?.destination_zone_id !== filters.zoneId) return false;
      if (!needle) return true;
      return [
        p.parcel_ref,
        p.orders?.order_number,
        p.orders?.tracking_number,
        p.orders?.recipient_name,
        p.orders?.recipient_phone,
      ]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(needle));
    })
    .map((p) => ({
      id: p.id,
      parcelRef: p.parcel_ref,
      status: p.status as ParcelStatus,
      bucket: bucketFor(p.status as ParcelStatus),
      weightKg: p.weight_kg == null ? null : Number(p.weight_kg),
      createdAt: p.created_at,
      deliveredAt: p.delivered_at ?? null,
      orderNumber: p.orders?.order_number ?? null,
      recipientName: p.orders?.recipient_name ?? null,
      recipientPhone: p.orders?.recipient_phone ?? null,
      town: p.orders?.destination_town ?? null,
      relayName: p.current_relay_id
        ? (relayName[p.current_relay_id] ?? null)
        : (relayName[p.destination_relay_id] ?? null),
      driverName: p.delivered_by ? (staffName[p.delivered_by] ?? null) : null,
    }));
}

/** Bucket counts for the rows currently in view. */
export function bucketCounts(rows: OpsParcelRow[]): Record<OpsBucket, number> {
  const counts: Record<OpsBucket, number> = {
    created: 0,
    in_transit: 0,
    at_relay: 0,
    delivered: 0,
    exception: 0,
  };
  for (const r of rows) if (r.bucket) counts[r.bucket] += 1;
  return counts;
}

/**
 * Full event history for one parcel, with the internal detail the public
 * tracking page withholds: actor, role and whether the update was scanned,
 * typed or imported (SN-TRK-02, SN-TRK-03).
 */
export interface OpsEvent {
  at: string;
  eventType: string;
  resultingStatus: string | null;
  actorName: string;
  actorRole: string | null;
  source: string;
  relayName: string | null;
  exceptionCode: string | null;
  exceptionNote: string | null;
  reason: string | null;
}

export async function getParcelHistory(parcelId: string): Promise<OpsEvent[]> {
  const db = supabaseAdmin();
  const [{ data, error }, { data: relays }] = await Promise.all([
    db.from("events").select("*").eq("parcel_id", parcelId).order("at", { ascending: true }),
    db.from("relays").select("id, name"),
  ]);
  if (error) throw error;
  const relayName = Object.fromEntries(((relays ?? []) as any[]).map((r) => [r.id, r.name]));

  return ((data ?? []) as any[]).map((e) => ({
    at: e.at,
    eventType: e.event_type,
    resultingStatus: e.resulting_status ?? null,
    actorName: e.actor_name ?? "",
    actorRole: e.actor_role ?? null,
    source: e.source ?? "manual",
    relayName: e.relay_id ? (relayName[e.relay_id] ?? null) : null,
    exceptionCode: e.exception_code ?? null,
    exceptionNote: e.exception_note ?? null,
    reason: e.reason ?? null,
  }));
}

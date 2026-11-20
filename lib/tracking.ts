// Public parcel tracking (spec §7, SN-TRK-01).
//
// What the public sees is a deliberately narrow projection of the custody
// ledger: understandable statuses, timestamps and relay pickup details —
// never internal records. Specifically NEVER exposed here:
//   - pickup codes (founder answer 2);
//   - who scanned what (actor names, roles, user ids);
//   - whether an update was scanned, typed or imported;
//   - internal exception codes, rejected-code attempts, database ids.
import { supabaseAdmin } from "@/lib/supabase";
import { PARCEL_STATUS_FR, type ParcelStatus } from "@/lib/parcels";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PublicEvent {
  label: string;
  at: string;
  relayName: string | null;
}

export interface PublicParcel {
  parcelRef: string;
  seq: number;
  status: ParcelStatus;
  statusFr: string;
  weightKg: number | null;
  events: PublicEvent[];
  /** Where to collect it, once it is actually collectable. */
  pickup: {
    relayName: string;
    address: string;
    town: string;
    hours: string;
  } | null;
}

export interface PublicTracking {
  trackingNumber: string;
  bookedAt: string;
  routeLabel: string;
  recipientName: string;
  parcelCount: number;
  scheduledTransportDate: string | null;
  estimatedFrom: string | null;
  estimatedTo: string | null;
  parcels: PublicParcel[];
}

/** Internal event types → customer-facing wording. */
const EVENT_LABEL: Record<string, string> = {
  "order.created": "Réservation enregistrée",
  "parcel.created": "Colis enregistré",
  "scan.collect": "Colis collecté",
  "scan.depart": "En route vers le point relais",
  "scan.handover": "Remis au point relais",
  "scan.relay_receipt": "Réception confirmée par le commerçant",
  "pickup.verified": "Retiré par le destinataire",
  "delivery.confirmed": "Livré à l'adresse",
  "delivery.failed_attempt": "Tentative de livraison échouée",
  "parcel.exception": "Incident signalé — en cours de traitement",
  "order.status_change": "Mise à jour du suivi",
};

/**
 * Events that exist for the audit trail but must not reach the customer:
 * rejected code attempts would tell an attacker they are close, and internal
 * corrections are operational detail.
 */
const PRIVATE_EVENTS = new Set([
  "pickup.code_rejected",
  "delivery.code_rejected",
]);

/**
 * Look up a shipment by its tracking number.
 *
 * The tracking number is random and unguessable (see SN-TRK-01 in
 * app/actions.ts), so possession of the code is what grants access.
 */
export async function getPublicTracking(code: string): Promise<PublicTracking | null> {
  const db = supabaseAdmin();
  const value = code.trim().toUpperCase();
  if (!value) return null;

  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, tracking_number, created_at, origin_town, destination_town, origin, destination, recipient_name, parcel_count, scheduled_transport_date, estimated_delivery_from, estimated_delivery_to",
    )
    .eq("tracking_number", value)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const o = order as any;

  const [{ data: parcels }, { data: events }, { data: relays }] = await Promise.all([
    // Explicit column list: the pickup_code_* columns are never even read
    // here, so a future refactor cannot accidentally leak them to the public
    // page (founder answer 2).
    db
      .from("parcels")
      .select(
        "id, parcel_ref, seq, status, weight_kg, current_relay_id, destination_relay_id",
      )
      .eq("order_id", o.id)
      .order("seq", { ascending: true }),
    db
      .from("events")
      .select("parcel_id, event_type, resulting_status, relay_id, at")
      .eq("order_id", o.id)
      .order("at", { ascending: true }),
    db.from("relays").select("id, name, address, town, opening_hours"),
  ]);

  const relayById = Object.fromEntries(((relays ?? []) as any[]).map((r) => [r.id, r]));

  const publicParcels: PublicParcel[] = ((parcels ?? []) as any[]).map((p) => {
    const parcelEvents = ((events ?? []) as any[])
      .filter((e) => e.parcel_id === p.id || (e.parcel_id == null && e.event_type === "order.created"))
      .filter((e) => !PRIVATE_EVENTS.has(e.event_type))
      .map((e) => ({
        label: EVENT_LABEL[e.event_type] ?? e.resulting_status ?? "Mise à jour",
        at: e.at,
        relayName: e.relay_id ? (relayById[e.relay_id]?.name ?? null) : null,
      }));

    // Pickup details appear only once the parcel can actually be collected.
    const relay = p.current_relay_id
      ? relayById[p.current_relay_id]
      : relayById[p.destination_relay_id];
    const collectable = p.status === "Ready for pickup";

    return {
      parcelRef: p.parcel_ref,
      seq: p.seq ?? 1,
      status: p.status as ParcelStatus,
      statusFr: PARCEL_STATUS_FR[p.status as ParcelStatus] ?? p.status,
      weightKg: p.weight_kg == null ? null : Number(p.weight_kg),
      events: parcelEvents,
      pickup:
        collectable && relay
          ? {
              relayName: relay.name,
              address: relay.address ?? "",
              town: relay.town ?? "",
              hours: Object.values(relay.opening_hours ?? {}).filter(Boolean).join(" · "),
            }
          : null,
    };
  });

  return {
    trackingNumber: o.tracking_number,
    bookedAt: o.created_at,
    routeLabel:
      o.origin_town && o.destination_town
        ? `${o.origin_town} → ${o.destination_town}`
        : `${o.origin} → ${o.destination}`,
    recipientName: o.recipient_name,
    parcelCount: o.parcel_count ?? publicParcels.length ?? 1,
    scheduledTransportDate: o.scheduled_transport_date ?? null,
    estimatedFrom: o.estimated_delivery_from ?? null,
    estimatedTo: o.estimated_delivery_to ?? null,
    parcels: publicParcels,
  };
}

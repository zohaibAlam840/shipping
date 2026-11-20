// Relay-shop data access (spec §5, SN-REL-01…05).
import { supabaseAdmin } from "@/lib/supabase";
import type { CommercialStatus } from "@/lib/sn-shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Operational lifecycle, SN-REL-02. */
export type RelayStatus = "draft" | "pending" | "active" | "suspended" | "closed";

export const RELAY_STATUS_FR: Record<RelayStatus, string> = {
  draft: "Brouillon",
  pending: "En attente d'approbation",
  active: "Actif",
  suspended: "Suspendu",
  closed: "Fermé",
};

export const COMMERCIAL_STATUS_FR: Record<CommercialStatus, string> = {
  test: "Test / démonstration",
  active: "Ouvert commercialement",
  suspended: "Suspendu",
};

export interface Relay {
  id: string;
  code: string;
  name: string;
  region: string;
  town: string;
  neighborhood: string | null;
  address: string;
  gpsLat: number | null;
  gpsLng: number | null;
  contactName: string | null;
  contactPhone: string | null;
  openingHours: Record<string, string>;
  /** ISO weekdays the shop opens: 1 = Monday … 7 = Sunday. */
  openingDays: number[];
  collectionCutoff: string | null;
  capacity: number | null;
  permittedServices: string[];
  status: RelayStatus;
  commercialStatus: CommercialStatus;
  zoneId: string | null;
  notes: string | null;
  createdAt: string;
  /** Parcels physically held right now (SN-REL-04). */
  parcelsOnSite?: number;
}

function toRelay(r: any): Relay {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    region: r.region ?? "",
    town: r.town ?? "",
    neighborhood: r.neighborhood ?? null,
    address: r.address ?? "",
    gpsLat: r.gps_lat == null ? null : Number(r.gps_lat),
    gpsLng: r.gps_lng == null ? null : Number(r.gps_lng),
    contactName: r.contact_name ?? null,
    contactPhone: r.contact_phone ?? null,
    openingHours: (r.opening_hours ?? {}) as Record<string, string>,
    openingDays: r.opening_days ?? [1, 2, 3, 4, 5, 6],
    collectionCutoff: r.collection_cutoff ? String(r.collection_cutoff).slice(0, 5) : null,
    capacity: r.capacity == null ? null : Number(r.capacity),
    permittedServices: r.permitted_services ?? ["domestic"],
    status: (r.status ?? "draft") as RelayStatus,
    commercialStatus: (r.commercial_status ?? "test") as CommercialStatus,
    zoneId: r.zone_id ?? null,
    notes: r.notes ?? null,
    createdAt: r.created_at,
  };
}

/** Parcels currently held, per relay id. */
async function parcelCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin()
    .from("parcels")
    .select("current_relay_id")
    .in("status", ["Awaiting relay acceptance", "Ready for pickup"]);
  if (error) return {};
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as any).current_relay_id;
    if (id) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

export async function getRelays(): Promise<Relay[]> {
  const { data, error } = await supabaseAdmin()
    .from("relays")
    .select("*")
    .order("code", { ascending: true });
  if (error) throw error;
  const counts = await parcelCounts();
  return (data ?? []).map((r) => {
    const relay = toRelay(r);
    relay.parcelsOnSite = counts[relay.id] ?? 0;
    return relay;
  });
}

export async function getRelayById(id: string): Promise<Relay | null> {
  const { data, error } = await supabaseAdmin()
    .from("relays")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const relay = toRelay(data);
  const counts = await parcelCounts();
  relay.parcelsOnSite = counts[relay.id] ?? 0;
  return relay;
}

/**
 * Relays a customer can choose at booking (SN-NAT-03, SN-REL-02).
 *
 * Only operationally active AND commercially open shops appear. Suspended,
 * pending and test-only shops disappear from new bookings while staying
 * visible everywhere else, so parcels already in their hands keep moving.
 */
export async function getBookableRelays(town?: string): Promise<Relay[]> {
  let query = supabaseAdmin()
    .from("relays")
    .select("*")
    .eq("status", "active")
    .eq("commercial_status", "active");
  if (town) query = query.ilike("town", town);
  const { data, error } = await query.order("town", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toRelay);
}

/** Next free code in the YM-SN-Rnnn series (SN-REL-01). */
export async function nextRelayCode(): Promise<string> {
  const { data } = await supabaseAdmin()
    .from("relays")
    .select("code")
    .like("code", "YM-SN-R%")
    .order("code", { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = (data as any)?.code as string | undefined;
  const n = last ? parseInt(last.replace("YM-SN-R", ""), 10) + 1 : 1;
  return `YM-SN-R${String(Number.isFinite(n) ? n : 1).padStart(3, "0")}`;
}

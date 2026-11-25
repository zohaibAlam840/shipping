// Driver rounds (spec §10: "ID, driver, stops, assigned parcels, actions and
// proofs"). A round groups the parcels one driver moves on one transport day.
import { supabaseAdmin } from "@/lib/supabase";
import type { ParcelWithContext } from "@/lib/parcels";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type RouteStatus = "planned" | "active" | "completed" | "cancelled";

export const ROUTE_STATUS_FR: Record<RouteStatus, string> = {
  planned: "Planifiée",
  active: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export interface DriverRoute {
  id: string;
  code: string;
  driverId: string | null;
  driverName: string | null;
  routeDate: string;
  originTown: string | null;
  destinationTown: string | null;
  status: RouteStatus;
  parcelCount: number;
}

export async function getRoutes(): Promise<DriverRoute[]> {
  const db = supabaseAdmin();
  const [{ data, error }, { data: staff }, { data: parcels }] = await Promise.all([
    db.from("driver_routes").select("*").order("route_date", { ascending: false }),
    db.from("app_users").select("id, full_name"),
    db.from("parcels").select("route_id"),
  ]);
  if (error) throw error;

  const names = Object.fromEntries(((staff ?? []) as any[]).map((u) => [u.id, u.full_name]));
  const counts: Record<string, number> = {};
  for (const p of (parcels ?? []) as any[]) {
    if (p.route_id) counts[p.route_id] = (counts[p.route_id] ?? 0) + 1;
  }

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    code: r.code,
    driverId: r.driver_id ?? null,
    driverName: r.driver_id ? (names[r.driver_id] ?? null) : null,
    routeDate: String(r.route_date).slice(0, 10),
    originTown: r.origin_town ?? null,
    destinationTown: r.destination_town ?? null,
    status: (r.status ?? "planned") as RouteStatus,
    parcelCount: counts[r.id] ?? 0,
  }));
}

/** Next free code in the T-nnn series. */
export async function nextRouteCode(): Promise<string> {
  const { data } = await supabaseAdmin()
    .from("driver_routes")
    .select("code")
    .like("code", "T-%")
    .order("code", { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = (data as any)?.code as string | undefined;
  const n = last ? parseInt(last.replace("T-", ""), 10) + 1 : 1;
  return `T-${String(Number.isFinite(n) ? n : 1).padStart(3, "0")}`;
}

/**
 * The parcels on a driver's own rounds — their "tournée".
 *
 * Only rounds that are planned or active count: a completed round stays on
 * record without cluttering the driver's screen.
 */
export async function getParcelsForDriverRoutes(driverId: string): Promise<ParcelWithContext[]> {
  const db = supabaseAdmin();
  const { data: routes } = await db
    .from("driver_routes")
    .select("id")
    .eq("driver_id", driverId)
    .in("status", ["planned", "active"]);

  const routeIds = ((routes ?? []) as any[]).map((r) => r.id);
  if (routeIds.length === 0) return [];

  const [{ data, error }, { data: relays }] = await Promise.all([
    db
      .from("parcels")
      .select(
        "*, orders(order_number, recipient_name, recipient_phone, recipient_address)",
      )
      .in("route_id", routeIds)
      .not("status", "in", '("Collected at relay","Delivered to address","Cancelled")')
      .order("created_at", { ascending: true }),
    db.from("relays").select("id, name"),
  ]);
  if (error) throw error;

  const relayName = Object.fromEntries(((relays ?? []) as any[]).map((r) => [r.id, r.name]));

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    parcelRef: r.parcel_ref,
    qrToken: r.qr_token,
    orderId: r.order_id ?? null,
    seq: r.seq ?? 1,
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    dimensions: r.dimensions ?? null,
    declaredContents: r.declared_contents ?? null,
    declaredValue: Number(r.declared_value ?? 0),
    status: r.status,
    currentRelayId: r.current_relay_id ?? null,
    destinationRelayId: r.destination_relay_id ?? null,
    routeId: r.route_id ?? null,
    pickupCodeSentAt: r.pickup_code_sent_at ?? null,
    pickupCodeSentTo: r.pickup_code_sent_to ?? null,
    pickupVerifiedAt: r.pickup_verified_at ?? null,
    deliveredAt: r.delivered_at ?? null,
    deliveryAttempts: r.delivery_attempts ?? 0,
    createdAt: r.created_at,
    orderNumber: r.orders?.order_number ?? null,
    recipientName: r.orders?.recipient_name ?? null,
    recipientPhone: r.orders?.recipient_phone ?? null,
    recipientAddress: r.orders?.recipient_address ?? null,
    relayName: r.current_relay_id ? (relayName[r.current_relay_id] ?? null) : null,
    destinationRelayName: r.destination_relay_id
      ? (relayName[r.destination_relay_id] ?? null)
      : null,
  }));
}

/** Parcels not yet on any round — the pool an administrator assigns from. */
export async function getUnassignedParcels(): Promise<
  { id: string; parcelRef: string; status: string; town: string | null; recipientName: string | null }[]
> {
  const { data, error } = await supabaseAdmin()
    .from("parcels")
    .select("id, parcel_ref, status, orders(destination_town, recipient_name)")
    .is("route_id", null)
    .in("status", ["Booked", "Accepted", "In transit"])
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    parcelRef: p.parcel_ref,
    status: p.status,
    town: p.orders?.destination_town ?? null,
    recipientName: p.orders?.recipient_name ?? null,
  }));
}

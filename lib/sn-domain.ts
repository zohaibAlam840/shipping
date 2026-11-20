// Senegal domestic domain layer — database access (server only).
//
// Types, labels and pure logic live in lib/sn-shared.ts and are re-exported
// here, so server code can import everything from one place while client
// components import the pure module and never pull Supabase into the bundle.
//
// Everything is configuration-driven: the founder's answers (20 Nov 2026)
// require the administrator to change prices, zones, transport days, cut-offs
// and closures without developer involvement. No price, town or weekday is
// hardcoded anywhere in this file.
import { supabaseAdmin } from "@/lib/supabase";
import {
  estimateDeliveryWindow,
  findPricingRule,
  nextTransportDate,
  type CommercialStatus,
  type OperatingSettings,
  type PricingRuleSN,
  type ServiceType,
  type Zone,
} from "@/lib/sn-shared";

export * from "@/lib/sn-shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

function toZone(r: any): Zone {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    region: r.region ?? "",
    towns: r.towns ?? [],
    commercialStatus: (r.commercial_status ?? "test") as CommercialStatus,
    sortOrder: r.sort_order ?? 100,
  };
}

export async function getZones(): Promise<Zone[]> {
  const { data, error } = await supabaseAdmin()
    .from("zones")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toZone);
}

/** Zones a real customer may book — the commercial launch area. */
export async function getSellableZones(): Promise<Zone[]> {
  return (await getZones()).filter((z) => z.commercialStatus === "active");
}

/** The zone covering a town, if any (case-insensitive). */
export async function zoneForTown(town: string): Promise<Zone | null> {
  const needle = town.trim().toLowerCase();
  if (!needle) return null;
  const zones = await getZones();
  return zones.find((z) => z.towns.some((t) => t.toLowerCase() === needle)) ?? null;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

function toRule(r: any): PricingRuleSN {
  return {
    id: r.id,
    originZoneId: r.origin_zone_id,
    destinationZoneId: r.destination_zone_id,
    serviceType: r.service_type as ServiceType,
    label: r.label ?? "",
    minWeightKg: Number(r.min_weight_kg ?? 0),
    maxWeightKg: r.max_weight_kg == null ? null : Number(r.max_weight_kg),
    price: Number(r.price),
    currency: r.currency ?? "XOF",
    status: (r.status ?? "active") as "active" | "inactive",
    sortOrder: r.sort_order ?? 100,
  };
}

export async function getPricingRules(): Promise<PricingRuleSN[]> {
  const { data, error } = await supabaseAdmin()
    .from("sn_pricing_rules")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toRule);
}

export interface DomesticQuote {
  price: number;
  currency: string;
  rule: PricingRuleSN;
}

/** Server-side price for one parcel. The client never supplies a price. */
export async function quoteDomestic(opts: {
  originZoneId: string;
  destinationZoneId: string;
  serviceType: ServiceType;
  weightKg: number;
}): Promise<DomesticQuote | null> {
  const rule = findPricingRule(await getPricingRules(), opts);
  if (!rule) return null;
  return { price: rule.price, currency: rule.currency, rule };
}

// ---------------------------------------------------------------------------
// Operating schedule
// ---------------------------------------------------------------------------

export async function getOperatingSettings(): Promise<OperatingSettings> {
  const { data, error } = await supabaseAdmin()
    .from("operating_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return {
    transportDays: data?.transport_days ?? [2, 4, 6],
    collectionCutoff: (data?.collection_cutoff ?? "16:00").slice(0, 5),
    deliveryMinDays: data?.delivery_min_days ?? 1,
    deliveryMaxDays: data?.delivery_max_days ?? 3,
    timezone: data?.timezone ?? "Africa/Dakar",
  };
}

/** Closure dates as ISO "YYYY-MM-DD", network-wide or for one relay. */
export async function getNonOperatingDays(relayId?: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin()
    .from("non_operating_days")
    .select("day, relay_id");
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => r.relay_id == null || r.relay_id === relayId)
    .map((r: any) => String(r.day).slice(0, 10));
}

/** Everything the booking screen needs about timing, in one call. */
export async function scheduleForDropoff(
  at: Date = new Date(),
  relayId?: string,
): Promise<{
  settings: OperatingSettings;
  transportDate: Date | null;
  deliveryFrom: Date | null;
  deliveryTo: Date | null;
}> {
  const [settings, closures] = await Promise.all([
    getOperatingSettings(),
    getNonOperatingDays(relayId),
  ]);
  const transportDate = nextTransportDate(at, settings, closures);
  if (!transportDate) {
    return { settings, transportDate: null, deliveryFrom: null, deliveryTo: null };
  }
  const window = estimateDeliveryWindow(transportDate, settings, closures);
  return {
    settings,
    transportDate,
    deliveryFrom: window.from,
    deliveryTo: window.to,
  };
}

// Senegal domestic: types, labels and pure logic.
//
// NO database imports here on purpose — this module is safe to import from
// client components. Anything that queries Supabase lives in lib/sn-domain.ts
// (server only), which re-exports everything below.

/** 'test' zones work for demonstration; only 'active' zones are sellable. */
export type CommercialStatus = "test" | "active" | "suspended";

export type ServiceType =
  | "relay_to_relay"
  | "relay_to_home"
  | "home_to_relay"
  | "home_to_home";

export const SERVICE_TYPE_FR: Record<ServiceType, string> = {
  relay_to_relay: "Relais → Relais",
  relay_to_home: "Relais → Domicile",
  home_to_relay: "Domicile → Relais",
  home_to_home: "Domicile → Domicile",
};

export interface Zone {
  id: string;
  code: string;
  name: string;
  region: string;
  towns: string[];
  commercialStatus: CommercialStatus;
  sortOrder: number;
}

export interface PricingRuleSN {
  id: string;
  originZoneId: string | null;
  destinationZoneId: string | null;
  serviceType: ServiceType;
  label: string;
  minWeightKg: number;
  maxWeightKg: number | null;
  price: number;
  currency: string;
  status: "active" | "inactive";
  sortOrder: number;
}

export interface OperatingSettings {
  /** ISO weekdays transport runs on: 1 = Monday … 7 = Sunday. */
  transportDays: number[];
  /** Hand-in deadline on a transport day, "HH:MM". */
  collectionCutoff: string;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  timezone: string;
}

export const WEEKDAY_FR: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

/** CFA franc, the currency of the domestic service. */
export const xof = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;

// ---------------------------------------------------------------------------
// Pricing (pure)
// ---------------------------------------------------------------------------

/**
 * Pick the rule that prices one parcel.
 *
 * Uniform regional model: weight band and service type decide the price, not
 * the distance between relays. A band is (min, max] — exclusive lower bound,
 * inclusive upper — so exactly 2 kg is priced in the "up to 2 kg" band.
 *
 * Returns null when nothing matches, which callers must surface as "custom
 * quote" and never as free.
 */
export function findPricingRule(
  rules: PricingRuleSN[],
  opts: {
    originZoneId: string;
    destinationZoneId: string;
    serviceType: ServiceType;
    weightKg: number;
  },
): PricingRuleSN | null {
  const candidates = rules.filter(
    (r) =>
      r.status === "active" &&
      r.serviceType === opts.serviceType &&
      r.originZoneId === opts.originZoneId &&
      r.destinationZoneId === opts.destinationZoneId,
  );
  const w = opts.weightKg;
  const match = candidates.find(
    (r) => w > r.minWeightKg && (r.maxWeightKg == null || w <= r.maxWeightKg),
  );
  // A parcel at or below the lowest floor still belongs to the first band.
  const fallback = candidates.find(
    (r) => r.minWeightKg === 0 && (r.maxWeightKg == null || w <= r.maxWeightKg),
  );
  return match ?? fallback ?? null;
}

/** Collection + delivery choice → the service type that prices it. */
export function serviceTypeFor(
  collection: "relay_dropoff" | "home_pickup",
  delivery: "relay_pickup" | "home_delivery",
): ServiceType {
  if (collection === "relay_dropoff" && delivery === "relay_pickup") return "relay_to_relay";
  if (collection === "relay_dropoff" && delivery === "home_delivery") return "relay_to_home";
  if (collection === "home_pickup" && delivery === "relay_pickup") return "home_to_relay";
  return "home_to_home";
}

// ---------------------------------------------------------------------------
// Schedule (pure)
// ---------------------------------------------------------------------------

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * The next day parcels actually move.
 *
 * Customers can drop off at a relay any day the shop is open, but drivers
 * collect only on transport days. A drop-off after the cut-off misses that
 * day's round.
 */
export function nextTransportDate(
  from: Date,
  settings: OperatingSettings,
  closures: string[] = [],
): Date | null {
  const closed = new Set(closures);
  const [h, m] = settings.collectionCutoff.split(":").map(Number);
  const cutoffMinutes = (h || 0) * 60 + (m || 0);

  for (let i = 0; i < 30; i++) {
    const day = addDays(from, i);
    if (!settings.transportDays.includes(isoWeekday(day))) continue;
    if (closed.has(toISODate(day))) continue;
    if (i === 0 && from.getHours() * 60 + from.getMinutes() >= cutoffMinutes) continue;
    return day;
  }
  return null;
}

/**
 * The delivery window quoted to the customer: 1–3 business days by default,
 * counted from the transport day. Sundays and closure days don't count.
 * deliveryMinDays = 1 means "available from the transport day itself".
 */
export function estimateDeliveryWindow(
  transportDate: Date,
  settings: OperatingSettings,
  closures: string[] = [],
): { from: Date; to: Date } {
  const closed = new Set(closures);
  const isBusinessDay = (d: Date) => isoWeekday(d) !== 7 && !closed.has(toISODate(d));

  const advance = (start: Date, businessDays: number): Date => {
    let cursor = new Date(start);
    let remaining = businessDays;
    let guard = 0;
    while (remaining > 0 && guard < 60) {
      cursor = addDays(cursor, 1);
      if (isBusinessDay(cursor)) remaining--;
      guard++;
    }
    return cursor;
  };

  return {
    from: advance(transportDate, Math.max(0, settings.deliveryMinDays - 1)),
    to: advance(transportDate, Math.max(0, settings.deliveryMaxDays - 1)),
  };
}

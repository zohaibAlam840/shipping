// Shared types, pricing constants and formatters.
// Live data comes from Supabase via lib/db.ts and app/actions.ts.

export type WeightBand = "0-1kg" | "1-3kg" | "3-7kg" | "7-15kg" | "15-25kg";
export type Country = "France" | "Senegal";
export type DeliveryOption = "Relay point" | "Post office" | "Home collection";

export const STATUSES = [
  "Pending Confirmation",
  "Parcel Received",
  "Processing",
  "Shipped from France",
  "In Transit",
  "Arrived in Senegal",
  "Out for Delivery",
  "Delivered",
] as const;
export type OrderStatus = (typeof STATUSES)[number];

export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";

export interface PricingRule {
  origin: Country;
  destination: Country;
  band: WeightBand;
  basePrice: number; // EUR
  transitDays: string;
}

export const WEIGHT_BANDS: WeightBand[] = [
  "0-1kg",
  "1-3kg",
  "3-7kg",
  "7-15kg",
  "15-25kg",
];

// Launch route: France → Sénégal only (Sénégal → France is a future phase).
export const ORIGIN: Country = "France";
export const DESTINATION: Country = "Senegal";

// Static copy of the pricing_rules table so public pages (landing,
// calculator) can quote instantly without a round-trip. The server
// recomputes the real price from the DB when an order is created.
// Official YonelMa pricing grid (France → Sénégal).
export const PRICING_RULES: PricingRule[] = [
  { origin: "France", destination: "Senegal", band: "0-1kg", basePrice: 19, transitDays: "5–7 jours" },
  { origin: "France", destination: "Senegal", band: "1-3kg", basePrice: 39, transitDays: "5–7 jours" },
  { origin: "France", destination: "Senegal", band: "3-7kg", basePrice: 64, transitDays: "6–8 jours" },
  { origin: "France", destination: "Senegal", band: "7-15kg", basePrice: 109, transitDays: "7–10 jours" },
  { origin: "France", destination: "Senegal", band: "15-25kg", basePrice: 169, transitDays: "7–10 jours" },
];

export const HOME_COLLECTION_FEE = 18;
export const INSURANCE_RATE = 0.04; // 4% of declared value
export const TAX_RATE = 0.0; // VAT handled later

export function findRule(origin: Country, destination: Country, band: WeightBand) {
  return PRICING_RULES.find(
    (r) => r.origin === origin && r.destination === destination && r.band === band,
  );
}

export function quote(opts: {
  origin: Country;
  destination: Country;
  band: WeightBand;
  homeCollection: boolean;
  insurance: boolean;
  declaredValue: number;
}) {
  const rule = findRule(opts.origin, opts.destination, opts.band);
  if (!rule) return null;
  const optionsFee =
    (opts.homeCollection ? HOME_COLLECTION_FEE : 0) +
    (opts.insurance ? Math.round(opts.declaredValue * INSURANCE_RATE * 100) / 100 : 0);
  const tax = Math.round((rule.basePrice + optionsFee) * TAX_RATE * 100) / 100;
  return {
    basePrice: rule.basePrice,
    transitDays: rule.transitDays,
    optionsFee,
    tax,
    total: Math.round((rule.basePrice + optionsFee + tax) * 100) / 100,
  };
}

export interface StatusEvent {
  status: OrderStatus | "Incident reported";
  at: string; // ISO date
  by: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingNumber: string;
  customer: string;
  customerEmail: string;
  origin: Country;
  destination: Country;
  band: WeightBand;
  delivery: DeliveryOption;
  insurance: boolean;
  recipient: { name: string; phone: string; address: string };
  parcel: { weightKg: number; description: string; declaredValue: number; dimensions: string };
  total: number;
  status: OrderStatus;
  payment: PaymentStatus;
  incident: boolean;
  partner: string | null;
  date: string;
  log: StatusEvent[];
}

// Registered logistics partners (static until partner accounts exist).
export const PARTNERS = [
  { name: "DakarExpress 3PL", type: "3PL", contact: "ops@dakarexpress.sn" },
  { name: "Teranga Logistics", type: "Freight", contact: "dispatch@teranga.sn" },
];

// "Signed-in" demo customer until auth lands.
export const ME = {
  name: "Awa Ndiaye",
  email: "awa@example.com",
  phone: "+33 6 45 12 78 90",
  address: "8 Rue des Martyrs, 75009 Paris",
};

export function statusIndex(s: OrderStatus) {
  return STATUSES.indexOf(s);
}

// ---- French display labels ----
// Status / payment / delivery / claim values stay canonical (English) in the
// database; these maps translate them for display only, so no data migration
// is needed and the timeline/styling logic keeps working.
export const STATUS_FR: Record<OrderStatus | "Incident reported", string> = {
  "Pending Confirmation": "En attente de confirmation",
  "Parcel Received": "Colis reçu",
  Processing: "En traitement",
  "Shipped from France": "Expédié de France",
  "In Transit": "En transit",
  "Arrived in Senegal": "Arrivé au Sénégal",
  "Out for Delivery": "En cours de livraison",
  Delivered: "Livré",
  "Incident reported": "Incident signalé",
};

export const PAYMENT_FR: Record<PaymentStatus, string> = {
  Unpaid: "Non payé",
  Paid: "Payé",
  Refunded: "Remboursé",
};

export const DELIVERY_FR: Record<DeliveryOption, string> = {
  "Relay point": "Point relais",
  "Post office": "Bureau de poste",
  "Home collection": "Enlèvement à domicile",
};

export const CLAIM_TYPE_FR: Record<string, string> = {
  Damaged: "Endommagé",
  Lost: "Perdu",
  "Delivery issue": "Problème de livraison",
  "Refund request": "Demande de remboursement",
};

export const CLAIM_STATUS_FR: Record<string, string> = {
  Open: "Ouvert",
  Investigating: "En cours d'examen",
  Resolved: "Résolu",
  Refunded: "Remboursé",
};

// Country display in French.
export const COUNTRY_FR: Record<Country, string> = {
  France: "France",
  Senegal: "Sénégal",
};

export const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

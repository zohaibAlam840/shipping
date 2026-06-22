// Shared types, pricing constants and formatters.
// Live data comes from Supabase via lib/db.ts and app/actions.ts.

// "25kg+" is the custom-quote band: parcels above 25 kg have no grid price —
// our team quotes them manually (see isCustomQuoteBand / CUSTOM_QUOTE_MESSAGE).
export type WeightBand = "0-1kg" | "1-3kg" | "3-7kg" | "7-15kg" | "15-25kg" | "25kg+";
export type Country = "France" | "Senegal";
// "3PL drop-off" = customer delivers directly to our 3PL partner (used for >25 kg).
export type DeliveryOption = "Relay point" | "Post office" | "Home collection" | "3PL drop-off";

// Operational workflow (canonical English keys, French shown via STATUS_FR).
export const STATUSES = [
  "Order Created",
  "Payment Received",
  "Awaiting E-Logik",
  "Received by E-Logik",
  "Pallet Preparation",
  "Collected by TAF",
  "In Air Transit",
  "Arrived in Dakar",
  "Customs Clearance",
  "Out for Delivery",
  "Delivered",
] as const;
export type OrderStatus = (typeof STATUSES)[number];

export type PaymentStatus = "Unpaid" | "Paid" | "Refunded";

export type ParcelCategory = "General Cargo" | "Perishable Goods" | "Regulated / DGR";
export const PARCEL_CATEGORIES: ParcelCategory[] = [
  "General Cargo",
  "Perishable Goods",
  "Regulated / DGR",
];
export const PARCEL_CATEGORY_FR: Record<ParcelCategory, string> = {
  "General Cargo": "Marchandise générale",
  "Perishable Goods": "Denrées périssables",
  "Regulated / DGR": "Marchandises réglementées / DGR",
};

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
  { origin: "France", destination: "Senegal", band: "0-1kg", basePrice: 19, transitDays: "5–10 jours" },
  { origin: "France", destination: "Senegal", band: "1-3kg", basePrice: 39, transitDays: "5–10 jours" },
  { origin: "France", destination: "Senegal", band: "3-7kg", basePrice: 64, transitDays: "5–10 jours" },
  { origin: "France", destination: "Senegal", band: "7-15kg", basePrice: 109, transitDays: "5–10 jours" },
  { origin: "France", destination: "Senegal", band: "15-25kg", basePrice: 169, transitDays: "5–10 jours" },
];

// Feature flags — flip to re-enable later without code changes elsewhere.
export const FEATURES = {
  reviews: false, // customer testimonials hidden until we have real ones
};

export const HOME_COLLECTION_FEE = 20; // "Collecte à domicile"
export const TAX_RATE = 0.0; // VAT handled later
export const VOLUMETRIC_DIVISOR = 6000; // (L×W×H cm) / 6000 = volumetric kg
export const MAX_PRICED_WEIGHT_KG = 25; // above this → custom quote

// Shown near the calculator to explain how pricing works.
export const CHARGEABLE_NOTE =
  "Le prix d'expédition est calculé sur le poids le plus élevé entre le poids réel et le poids volumétrique.";

// Shown instead of a price when the parcel is above 25 kg.
export const CUSTOM_QUOTE_MESSAGE =
  "Les envois de plus de 25 kg nécessitent un devis personnalisé. La collecte à domicile ou la livraison directe à notre partenaire 3PL est obligatoire. Notre équipe vous contactera sous 24 heures.";

/** True for the >25 kg band that has no grid price. */
export function isCustomQuoteBand(band: WeightBand) {
  return band === "25kg+";
}

/** French label for a weight band (custom-quote band gets a friendly label). */
export function bandLabel(band: WeightBand) {
  return band === "25kg+" ? "+25 kg" : band;
}

/** Price for display: a real amount, or "À devis" when not yet quoted (total ≤ 0). */
export function priceLabel(total: number) {
  return total > 0 ? eur(total) : "Sur devis";
}

// Delivery options allowed for >25 kg parcels (La Poste / Mondial Relay can't
// carry them): home collection by YonelMa, or direct drop-off at our 3PL.
export const CUSTOM_QUOTE_DELIVERY: DeliveryOption[] = ["Home collection", "3PL drop-off"];

/** Volumetric weight in kg from dimensions in centimetres. */
export function volumetricWeight(lengthCm: number, widthCm: number, heightCm: number) {
  if (!lengthCm || !widthCm || !heightCm) return 0;
  return Math.round(((lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR) * 100) / 100;
}

/** Chargeable weight = greater of actual and volumetric weight. */
export function chargeableWeight(actualKg: number, volumetricKg: number) {
  return Math.max(actualKg || 0, volumetricKg || 0);
}

/** Maps a chargeable weight (kg) to its pricing band. */
export function bandForWeight(kg: number): WeightBand {
  if (kg <= 1) return "0-1kg";
  if (kg <= 3) return "1-3kg";
  if (kg <= 7) return "3-7kg";
  if (kg <= 15) return "7-15kg";
  if (kg <= 25) return "15-25kg";
  return "25kg+"; // above 25 kg → custom quote (no grid price)
}

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
}) {
  const rule = findRule(opts.origin, opts.destination, opts.band);
  if (!rule) return null;
  const optionsFee = opts.homeCollection ? HOME_COLLECTION_FEE : 0;
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
  category?: ParcelCategory | null;
  recipient: { name: string; phone: string; address: string };
  parcel: { weightKg: number; description: string; declaredValue: number; dimensions: string };
  chargeableWeightKg?: number | null;
  dropoffPoint?: string | null; // chosen La Poste office / Mondial Relay point
  total: number;
  status: OrderStatus;
  payment: PaymentStatus;
  incident: boolean;
  partner: string | null;
  date: string;
  log: StatusEvent[];
}

// Logistics partners. `api` reflects whether YonelMa is connected to their
// system yet: "connected" = live API, "pending" = integration in progress,
// "manual" = handled by email/manifest for now.
export type PartnerApiStatus = "connected" | "pending" | "manual";
export interface Partner {
  name: string;
  region: "France" | "Sénégal";
  role: string;
  api: PartnerApiStatus;
}

export const PARTNERS: Partner[] = [
  { name: "Mondial Relay", region: "France", role: "Points relais · dépôt colis", api: "pending" },
  { name: "La Poste", region: "France", role: "Bureaux de poste · dépôt colis", api: "pending" },
  { name: "E-Logik", region: "France", role: "Logistique & entrepôt", api: "pending" },
  { name: "TAF Afrique", region: "France", role: "Fret France → Sénégal", api: "pending" },
  { name: "PAPS Transit", region: "Sénégal", role: "Transit & dédouanement", api: "pending" },
  { name: "PAPS Livraison", region: "Sénégal", role: "Livraison dernier kilomètre", api: "pending" },
];

export const PARTNER_API_FR: Record<PartnerApiStatus, string> = {
  connected: "Connecté",
  pending: "Intégration en cours",
  manual: "Manuel (e-mail / manifeste)",
};

// Sample drop-off points. These are placeholders until the Mondial Relay /
// La Poste APIs are connected and return real points near the sender.
export const MONDIAL_RELAY_POINTS = [
  "Tabac de la Gare — 12 Rue de la Gare, 75010 Paris",
  "Carrefour City — 45 Bd Voltaire, 75011 Paris",
  "Presse du Centre — 8 Rue Nationale, 59000 Lille",
  "Épicerie du Coin — 23 Cours Lafayette, 69003 Lyon",
  "Librairie Centrale — 5 Rue Paradis, 13001 Marseille",
];

export const LAPOSTE_OFFICES = [
  "Bureau de Poste Paris Louvre — 52 Rue du Louvre, 75001 Paris",
  "Bureau de Poste Lyon Bellecour — 10 Place Bellecour, 69002 Lyon",
  "Bureau de Poste Marseille Colbert — 1 Pl. de l'Hôtel des Postes, 13001 Marseille",
  "Bureau de Poste Lille Centre — 7 Rue de Béthune, 59000 Lille",
  "Bureau de Poste Toulouse Capitole — 9 Rue Lapeyrouse, 31000 Toulouse",
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
  "Order Created": "Commande créée",
  "Payment Received": "Paiement reçu",
  "Awaiting E-Logik": "En attente de réception E-Logik",
  "Received by E-Logik": "Reçu par E-Logik",
  "Pallet Preparation": "Préparation de la palette",
  "Collected by TAF": "Collecté par TAF",
  "In Air Transit": "En transit aérien",
  "Arrived in Dakar": "Arrivé à Dakar",
  "Customs Clearance": "Dédouanement (PAPS)",
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
  "Home collection": "Collecte à domicile",
  "3PL drop-off": "Dépôt direct chez notre partenaire 3PL",
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

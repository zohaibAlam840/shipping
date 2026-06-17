// Excel/CSV export of all orders (business view).
// Protected by the admin session via proxy.ts.
import { getOrders } from "@/lib/db";
import { toCsv, csvResponse, stamp } from "@/lib/csv";
import {
  COUNTRY_FR,
  DELIVERY_FR,
  STATUS_FR,
  PAYMENT_FR,
  PARCEL_CATEGORY_FR,
  fmtDate,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await getOrders();

  const headers = [
    "Référence",
    "Date",
    "Client",
    "E-mail client",
    "Origine",
    "Destination",
    "Tranche de poids",
    "Catégorie",
    "Option de livraison",
    "Point de dépôt",
    "Destinataire",
    "Téléphone destinataire",
    "Adresse de livraison",
    "Contenu",
    "Poids réel (kg)",
    "Poids facturable (kg)",
    "Valeur déclarée (€)",
    "Total (€)",
    "Statut",
    "Paiement",
    "Partenaire",
    "Incident",
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    fmtDate(o.date),
    o.customer,
    o.customerEmail,
    COUNTRY_FR[o.origin],
    COUNTRY_FR[o.destination],
    o.band,
    o.category ? PARCEL_CATEGORY_FR[o.category] : "",
    DELIVERY_FR[o.delivery],
    o.dropoffPoint ?? "",
    o.recipient.name,
    o.recipient.phone,
    o.recipient.address,
    o.parcel.description,
    o.parcel.weightKg,
    o.chargeableWeightKg ?? o.parcel.weightKg,
    o.parcel.declaredValue,
    o.total,
    STATUS_FR[o.status],
    PAYMENT_FR[o.payment],
    o.partner ?? "",
    o.incident ? "Oui" : "Non",
  ]);

  return csvResponse(`yonelma-commandes-${stamp()}.csv`, toCsv(headers, rows));
}

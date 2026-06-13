// Shipment manifest for carrier handover (E-Logik / TAF / PAPS).
// Lists every active (not yet delivered) parcel with logistics columns.
import { getOrders } from "@/lib/db";
import { toCsv, csvResponse, stamp } from "@/lib/csv";
import { COUNTRY_FR, DELIVERY_FR, STATUS_FR, fmtDate } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = (await getOrders())
    .filter((o) => o.status !== "Delivered")
    .sort((a, b) => (a.partner ?? "").localeCompare(b.partner ?? ""));

  const headers = [
    "Référence",
    "Date",
    "Destinataire",
    "Téléphone",
    "Adresse de livraison",
    "Pays",
    "Poids (kg)",
    "Dimensions",
    "Contenu",
    "Valeur déclarée (€)",
    "Option de livraison",
    "Partenaire",
    "Statut",
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    fmtDate(o.date),
    o.recipient.name,
    o.recipient.phone,
    o.recipient.address,
    COUNTRY_FR[o.destination],
    o.parcel.weightKg,
    o.parcel.dimensions,
    o.parcel.description,
    o.parcel.declaredValue,
    DELIVERY_FR[o.delivery],
    o.partner ?? "Non assigné",
    STATUS_FR[o.status],
  ]);

  return csvResponse(`yonelma-manifeste-${stamp()}.csv`, toCsv(headers, rows));
}

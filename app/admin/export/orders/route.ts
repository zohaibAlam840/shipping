// Excel/CSV export of all orders (business view).
// Protected by the admin session via proxy.ts.
import { getOrders } from "@/lib/db";
import { toCsv, csvResponse, stamp } from "@/lib/csv";
import {
  COUNTRY_FR,
  DELIVERY_FR,
  STATUS_FR,
  PAYMENT_FR,
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
    "Option de livraison",
    "Assurance",
    "Destinataire",
    "Téléphone destinataire",
    "Adresse de livraison",
    "Contenu",
    "Poids (kg)",
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
    DELIVERY_FR[o.delivery],
    o.insurance ? "Oui" : "Non",
    o.recipient.name,
    o.recipient.phone,
    o.recipient.address,
    o.parcel.description,
    o.parcel.weightKg,
    o.parcel.declaredValue,
    o.total,
    STATUS_FR[o.status],
    PAYMENT_FR[o.payment],
    o.partner ?? "",
    o.incident ? "Oui" : "Non",
  ]);

  return csvResponse(`yonelma-commandes-${stamp()}.csv`, toCsv(headers, rows));
}

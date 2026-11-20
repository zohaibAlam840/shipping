// Excel/CSV export of operational parcel records (SN-TRK-04, AT-09).
// Honours the same filters as the operations screen, so what you see is what
// you export.
import { searchParcels, BUCKET_FR, type OpsFilters } from "@/lib/ops";
import { PARCEL_STATUS_FR } from "@/lib/parcels";
import { toCsv, csvResponse, stamp } from "@/lib/csv";
import { fmtDateTime } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const filters: OpsFilters = {
    q: sp.get("q") ?? undefined,
    relayId: sp.get("relay") ?? undefined,
    zoneId: sp.get("zone") ?? undefined,
    status: (sp.get("status") as OpsFilters["status"]) ?? "All",
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };

  const rows = await searchParcels(filters);

  const headers = [
    "Colis",
    "Commande",
    "Statut",
    "Catégorie",
    "Destinataire",
    "Téléphone",
    "Ville",
    "Point relais",
    "Poids (kg)",
    "Créé le",
    "Livré le",
    "Agent",
  ];

  const body = rows.map((p) => [
    p.parcelRef,
    p.orderNumber ?? "",
    PARCEL_STATUS_FR[p.status],
    p.bucket ? BUCKET_FR[p.bucket] : "",
    p.recipientName ?? "",
    p.recipientPhone ?? "",
    p.town ?? "",
    p.relayName ?? "",
    p.weightKg ?? "",
    fmtDateTime(p.createdAt),
    p.deliveredAt ? fmtDateTime(p.deliveredAt) : "",
    p.driverName ?? "",
  ]);

  return csvResponse(`yonelma-colis-${stamp()}.csv`, toCsv(headers, body));
}

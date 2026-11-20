// Excel/CSV export of the relay-shop network (SN-REL-04).
import { getRelays, RELAY_STATUS_FR, COMMERCIAL_STATUS_FR } from "@/lib/relays";
import { getZones } from "@/lib/sn-domain";
import { toCsv, csvResponse, stamp } from "@/lib/csv";
import { fmtDate } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const [relays, zones] = await Promise.all([getRelays(), getZones()]);
  const zoneName = (id: string | null) => zones.find((z) => z.id === id)?.name ?? "";

  const headers = [
    "Code",
    "Nom",
    "Zone",
    "Région",
    "Ville",
    "Quartier",
    "Adresse",
    "Responsable",
    "Téléphone",
    "Statut",
    "Ouverture commerciale",
    "Capacité",
    "Colis sur place",
    "Services",
    "Créé le",
  ];

  const rows = relays.map((r) => [
    r.code,
    r.name,
    zoneName(r.zoneId),
    r.region,
    r.town,
    r.neighborhood ?? "",
    r.address,
    r.contactName ?? "",
    r.contactPhone ?? "",
    RELAY_STATUS_FR[r.status],
    COMMERCIAL_STATUS_FR[r.commercialStatus],
    r.capacity ?? "",
    r.parcelsOnSite ?? 0,
    r.permittedServices.join(" / "),
    fmtDate(r.createdAt),
  ]);

  return csvResponse(`yonelma-points-relais-${stamp()}.csv`, toCsv(headers, rows));
}

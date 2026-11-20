// Zone administration — progressive regional activation (founder answer 4).
import { getZones } from "@/lib/sn-domain";
import { getRelays } from "@/lib/relays";
import { PageTitle } from "@/components/ui";
import { ZonesManager } from "./zones-manager";

export const metadata = { title: "Zones" };
export const dynamic = "force-dynamic";

export default async function AdminZonesPage() {
  const [zones, relays] = await Promise.all([getZones(), getRelays()]);

  const relayCounts: Record<string, number> = {};
  for (const r of relays) {
    if (r.zoneId) relayCounts[r.zoneId] = (relayCounts[r.zoneId] ?? 0) + 1;
  }

  const live = zones.filter((z) => z.commercialStatus === "active").length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <PageTitle
          title="Zones géographiques"
          subtitle={`${zones.length} zone(s) · ${live} ouverte(s) commercialement. Les zones en test servent à la démonstration sans être vendues.`}
        />
      </div>
      <ZonesManager zones={zones} relayCounts={relayCounts} />
    </div>
  );
}

import { requireStaff } from "@/lib/roles";
import { getRelays } from "@/lib/relays";
import { getParcelsForDriver } from "@/lib/parcels";
import { getOperatingSettings, WEEKDAY_FR } from "@/lib/sn-domain";
import { PageTitle } from "@/components/ui";
import { DriverConsole, type RelayOption } from "./driver-console";

export const metadata = { title: "Tournée chauffeur" };
export const dynamic = "force-dynamic";

export default async function DriverPage() {
  const user = await requireStaff(["driver", "admin", "support"]);
  const [parcels, relays, settings] = await Promise.all([
    getParcelsForDriver(user.id),
    getRelays(),
    getOperatingSettings(),
  ]);

  // Drivers only ever hand over to operational shops.
  const options: RelayOption[] = relays
    .filter((r) => r.status === "active")
    .map((r) => ({ id: r.id, name: r.name, town: r.town }));

  const days = settings.transportDays.map((d) => WEEKDAY_FR[d]).join(" · ");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <PageTitle
          title="Ma tournée"
          subtitle={`${parcels.length} colis à traiter · transport ${days}`}
        />
      </div>
      <DriverConsole parcels={parcels} relays={options} />
    </div>
  );
}

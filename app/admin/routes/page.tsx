// Driver rounds: planning and parcel assignment (spec §10).
import { getRoutes, nextRouteCode, getUnassignedParcels } from "@/lib/routes";
import { getStaff } from "@/lib/staff";
import { getOperatingSettings, WEEKDAY_FR } from "@/lib/sn-domain";
import { Card, PageTitle } from "@/components/ui";
import { RoutesManager, type DriverChoice } from "./routes-manager";

export const metadata = { title: "Tournées" };
export const dynamic = "force-dynamic";

export default async function AdminRoutesPage() {
  const [routes, staff, unassigned, code, settings] = await Promise.all([
    getRoutes(),
    getStaff(),
    getUnassignedParcels(),
    nextRouteCode(),
    getOperatingSettings(),
  ]);

  const drivers: DriverChoice[] = staff
    .filter((u) => u.role === "driver" && u.status !== "suspended")
    .map((u) => ({ id: u.id, name: u.name || u.email }));

  const transportDays = settings.transportDays.map((d) => WEEKDAY_FR[d]).join(" · ");
  const active = routes.filter((r) => r.status === "active").length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <PageTitle
          title="Tournées"
          subtitle={`${routes.length} tournée(s) · ${active} en cours · ${unassigned.length} colis non affectés`}
        />
      </div>

      <Card className="mb-4 p-4">
        <p className="text-sm text-muted">
          Jours de transport : <span className="font-semibold text-ink">{transportDays}</span>.
          Les colis affectés apparaissent immédiatement sur l&apos;écran du chauffeur.
        </p>
      </Card>

      {drivers.length === 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50/60 p-4">
          <p className="text-sm text-amber-800">
            Aucun compte chauffeur n&apos;existe encore. Créez-en un dans
            « Personnel » pour pouvoir lui affecter une tournée.
          </p>
        </Card>
      )}

      <RoutesManager
        routes={routes}
        drivers={drivers}
        unassigned={unassigned}
        defaultCode={code}
      />
    </div>
  );
}

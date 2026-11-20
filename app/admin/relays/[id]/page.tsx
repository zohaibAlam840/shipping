import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelayById, RELAY_STATUS_FR, COMMERCIAL_STATUS_FR } from "@/lib/relays";
import { getZones, WEEKDAY_FR } from "@/lib/sn-domain";
import { fmtDate } from "@/lib/data";
import { Card, PageTitle } from "@/components/ui";
import { RelayForm } from "../relay-form";

export const dynamic = "force-dynamic";

export default async function RelayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [relay, zones] = await Promise.all([getRelayById(id), getZones()]);
  if (!relay) notFound();

  const openDays = Object.entries(relay.openingHours)
    .filter(([, v]) => v)
    .map(([k, v]) => `${WEEKDAY_FR[Number(k)] ?? k} ${v}`);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/relays" className="text-sm font-semibold text-brand">
        ← Points relais
      </Link>
      <div className="mt-3 mb-4">
        <PageTitle
          title={`${relay.code} · ${relay.name}`}
          subtitle={`${RELAY_STATUS_FR[relay.status]} · ${COMMERCIAL_STATUS_FR[relay.commercialStatus]} · créé le ${fmtDate(relay.createdAt)}`}
        />
      </div>

      <Card className="mb-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-muted">Colis sur place</p>
            <p className="text-2xl font-bold text-ink">{relay.parcelsOnSite ?? 0}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Capacité</p>
            <p className="text-2xl font-bold text-ink">{relay.capacity ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Jours d&apos;ouverture</p>
            <p className="text-2xl font-bold text-ink">{openDays.length}</p>
          </div>
        </div>
        {openDays.length > 0 && (
          <p className="mt-3 text-sm text-muted">{openDays.join(" · ")}</p>
        )}
      </Card>

      <RelayForm relay={relay} zones={zones} />
    </div>
  );
}

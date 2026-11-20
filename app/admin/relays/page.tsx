// Relay-shop network administration (spec §5).
import Link from "next/link";
import { getRelays } from "@/lib/relays";
import { getZones } from "@/lib/sn-domain";
import { Card, PageTitle } from "@/components/ui";
import { PlusIcon, DownloadIcon } from "@/components/icons";
import { RelaysExplorer } from "./relays-explorer";

export const metadata = { title: "Points relais" };
export const dynamic = "force-dynamic";

export default async function AdminRelaysPage() {
  const [relays, zones] = await Promise.all([getRelays(), getZones()]);

  const active = relays.filter((r) => r.status === "active").length;
  const pending = relays.filter((r) => r.status === "pending").length;
  const onSite = relays.reduce((sum, r) => sum + (r.parcelsOnSite ?? 0), 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageTitle
          title="Points relais"
          subtitle={`${relays.length} boutique(s) · ${active} active(s) · ${pending} en attente · ${onSite} colis sur place`}
        />
        <div className="flex gap-2">
          <Link
            href="/admin/export/relays"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
          >
            <DownloadIcon width={16} height={16} /> Exporter
          </Link>
          <Link
            href="/admin/relays/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            <PlusIcon width={16} height={16} /> Ajouter un point relais
          </Link>
        </div>
      </div>

      {relays.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-ink">Aucun point relais pour le moment</p>
          <p className="mt-1 text-sm text-muted">
            Créez votre première boutique partenaire pour qu&apos;elle apparaisse lors de la
            réservation.
          </p>
        </Card>
      ) : (
        <RelaysExplorer relays={relays} zones={zones} />
      )}
    </div>
  );
}

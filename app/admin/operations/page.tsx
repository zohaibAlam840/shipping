// Operations dashboard: parcel buckets, filters and search (SN-TRK-02, SN-TRK-04).
import Link from "next/link";
import { searchParcels, bucketCounts, BUCKET_FR, type OpsBucket, type OpsFilters } from "@/lib/ops";
import { PARCEL_STATUS_FR, type ParcelStatus } from "@/lib/parcels";
import { getRelays } from "@/lib/relays";
import { getZones } from "@/lib/sn-domain";
import { fmtDate } from "@/lib/data";
import { Card, PageTitle, inputCls } from "@/components/ui";
import { DownloadIcon, SearchIcon, BoxIcon } from "@/components/icons";

export const metadata = { title: "Opérations" };
export const dynamic = "force-dynamic";

const BUCKET_TONE: Record<OpsBucket, string> = {
  created: "text-slate-600",
  in_transit: "text-indigo-600",
  at_relay: "text-amber-600",
  delivered: "text-brand",
  exception: "text-red-600",
};

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: OpsFilters = {
    q: sp.q,
    relayId: sp.relay,
    zoneId: sp.zone,
    status: (sp.status as ParcelStatus | "All") || "All",
    from: sp.from,
    to: sp.to,
  };

  const [rows, relays, zones] = await Promise.all([
    searchParcels(filters),
    getRelays(),
    getZones(),
  ]);
  const counts = bucketCounts(rows);

  const query = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="Opérations" subtitle={`${rows.length} colis correspondent aux filtres`} />
        <Link
          href={`/admin/export/parcels${query ? `?${query}` : ""}`}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
        >
          <DownloadIcon width={16} height={16} /> Exporter
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(Object.keys(BUCKET_FR) as OpsBucket[]).map((b) => (
          <Card key={b} className="p-4">
            <p className="text-xs font-medium text-muted">{BUCKET_FR[b]}</p>
            <p className={`text-3xl font-bold ${BUCKET_TONE[b]}`}>{counts[b]}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <SearchIcon
              width={18}
              height={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              className={`${inputCls} pl-10`}
              placeholder="Colis, commande, destinataire"
            />
          </div>
          <select name="relay" defaultValue={sp.relay ?? ""} className={inputCls}>
            <option value="">Tous les relais</option>
            {relays.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select name="zone" defaultValue={sp.zone ?? ""} className={inputCls}>
            <option value="">Toutes les zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={sp.status ?? "All"} className={inputCls}>
            <option value="All">Tous les statuts</option>
            {(Object.keys(PARCEL_STATUS_FR) as ParcelStatus[]).map((s) => (
              <option key={s} value={s}>
                {PARCEL_STATUS_FR[s]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input type="date" name="from" defaultValue={sp.from ?? ""} className={inputCls} />
            <input type="date" name="to" defaultValue={sp.to ?? ""} className={inputCls} />
          </div>
          <div className="flex gap-2 lg:col-span-6">
            <button
              type="submit"
              className="h-11 rounded-full bg-brand px-6 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Filtrer
            </button>
            <Link
              href="/admin/operations"
              className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink"
            >
              Réinitialiser
            </Link>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {rows.map((p) => (
          <Link key={p.id} href={`/admin/parcels/${p.id}`} className="block">
            <Card className="p-4 transition hover:border-brand/40">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <BoxIcon width={18} height={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {p.parcelRef}
                    {p.orderNumber ? ` · ${p.orderNumber}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {p.recipientName ?? "—"}
                    {p.town ? ` · ${p.town}` : ""}
                    {p.relayName ? ` · ${p.relayName}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">Créé le {fmtDate(p.createdAt)}</p>
                </div>
                <span
                  className={`rounded-full border border-line px-3 py-1 text-xs font-semibold ${
                    p.bucket ? BUCKET_TONE[p.bucket] : "text-muted"
                  }`}
                >
                  {PARCEL_STATUS_FR[p.status]}
                </span>
              </div>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">
            Aucun colis ne correspond à ces filtres.
          </Card>
        )}
      </div>
    </div>
  );
}

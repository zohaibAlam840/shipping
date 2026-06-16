import Link from "next/link";
import {
  PARTNERS,
  PARTNER_API_FR,
  fmtDate,
  type Partner,
  type Order,
} from "@/lib/data";
import { getOrders } from "@/lib/db";
import { Card, PageTitle, StatusBadge } from "@/components/ui";
import { TruckIcon, BoxIcon, CheckIcon, AlertIcon, ChevronRightIcon } from "@/components/icons";

export const metadata = { title: "Partenaires" };
export const dynamic = "force-dynamic";

const API_STYLES: Record<string, string> = {
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  manual: "bg-sky-50 text-sky-700 border-sky-200",
};

function PartnerCard({ partner, orders }: { partner: Partner; orders: Order[] }) {
  const mine = orders.filter((o) => o.partner === partner.name);
  const active = mine.filter((o) => o.status !== "Delivered");
  const delivered = mine.filter((o) => o.status === "Delivered");
  const incidents = mine.filter((o) => o.incident);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
            <TruckIcon width={22} height={22} />
          </span>
          <div>
            <p className="font-semibold text-ink">{partner.name}</p>
            <p className="text-xs text-muted">{partner.role}</p>
          </div>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${API_STYLES[partner.api]}`}>
          {PARTNER_API_FR[partner.api]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-background p-2.5">
          <p className="text-lg font-bold text-ink">{active.length}</p>
          <p className="text-[10px] text-muted">Actifs</p>
        </div>
        <div className="rounded-xl bg-background p-2.5">
          <p className="text-lg font-bold text-ink">{delivered.length}</p>
          <p className="text-[10px] text-muted">Livrés</p>
        </div>
        <div className="rounded-xl bg-background p-2.5">
          <p className={`text-lg font-bold ${incidents.length ? "text-red-600" : "text-ink"}`}>{incidents.length}</p>
          <p className="text-[10px] text-muted">Incidents</p>
        </div>
      </div>

      {/* Per-parcel status — will auto-sync once the partner API is connected */}
      <div className="mt-4 space-y-2">
        {active.length === 0 && (
          <p className="text-xs text-muted">Aucun colis actif assigné.</p>
        )}
        {active.slice(0, 5).map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs transition hover:border-brand/40 group"
          >
            <span className="font-mono font-semibold text-ink">{o.orderNumber}</span>
            <span className="ml-auto">
              <StatusBadge status={o.status} incident={o.incident} />
            </span>
            <ChevronRightIcon width={14} height={14} className="text-muted shrink-0" />
          </Link>
        ))}
        {active.length > 5 && (
          <p className="text-[11px] text-muted">+ {active.length - 5} autre(s)…</p>
        )}
      </div>
    </Card>
  );
}

export default async function AdminPartnersPage() {
  const orders = await getOrders();
  const france = PARTNERS.filter((p) => p.region === "France");
  const senegal = PARTNERS.filter((p) => p.region === "Sénégal");

  const assigned = orders.filter((o) => o.partner).length;
  const unassigned = orders.filter((o) => !o.partner && o.status !== "Delivered").length;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Partenaires"
        subtitle="Statut des intégrations et des colis par partenaire"
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wide">Partenaires</span>
            <TruckIcon width={18} height={18} />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{PARTNERS.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wide">Colis assignés</span>
            <BoxIcon width={18} height={18} />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">{assigned}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wide">À assigner</span>
            <AlertIcon width={18} height={18} />
          </div>
          <p className={`mt-2 text-2xl font-bold ${unassigned ? "text-amber-600" : "text-ink"}`}>{unassigned}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-semibold uppercase tracking-wide">APIs connectées</span>
            <CheckIcon width={18} height={18} />
          </div>
          <p className="mt-2 text-2xl font-bold text-ink">
            {PARTNERS.filter((p) => p.api === "connected").length}/{PARTNERS.length}
          </p>
        </Card>
      </div>

      {/* API note */}
      <div className="rounded-2xl border border-brand/15 bg-brand-light/50 p-4 text-sm text-ink">
        <span className="font-semibold">Intégrations API.</span> Dès qu&apos;une API partenaire
        (Mondial Relay, La Poste, E-Logik, TAF Afrique, PAPS) est connectée, le statut des colis se
        mettra à jour automatiquement ici. En attendant, les statuts sont mis à jour manuellement
        ou via les manifestes d&apos;expédition.
      </div>

      <section>
        <h2 className="font-display text-base font-bold text-ink mb-3">🇫🇷 France</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {france.map((p) => (
            <PartnerCard key={p.name} partner={p} orders={orders} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-base font-bold text-ink mb-3">🇸🇳 Sénégal</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {senegal.map((p) => (
            <PartnerCard key={p.name} partner={p} orders={orders} />
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">Dernière actualisation : {fmtDate(new Date().toISOString())}</p>
    </div>
  );
}

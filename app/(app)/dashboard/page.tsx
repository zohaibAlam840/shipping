import Link from "next/link";
import {
  eur,
  fmtDate,
  statusIndex,
  STATUSES,
  COUNTRY_FR,
  STATUS_FR,
  type Order,
} from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { getOrdersByEmail } from "@/lib/db";
import { Card, StatusBadge, PaymentBadge } from "@/components/ui";
import { Donut, BarChart, HBars, PipelineProgress } from "@/components/charts";
import {
  BoxIcon,
  CheckIcon,
  ChartIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
  TruckIcon,
  PlaneIcon,
  ClockIcon,
  ArrowRightIcon,
  PinIcon,
} from "@/components/icons";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const PREP_STATUSES = [
  "Order Created",
  "Payment Received",
  "Awaiting E-Logik",
  "Received by E-Logik",
  "Pallet Preparation",
];
const TRANSIT_STATUSES = [
  "Collected by TAF",
  "In Air Transit",
  "Arrived in Dakar",
  "Customs Clearance",
  "Out for Delivery",
];

function monthBuckets(orders: Order[], months = 6) {
  const now = new Date();
  const buckets: { label: string; key: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: d.toLocaleString("en-GB", { month: "short" }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
      value: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]));
  for (const o of orders) {
    const d = new Date(o.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const i = idx.get(k);
    if (i !== undefined) buckets[i].value += 1;
  }
  return buckets;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const orders = await getOrdersByEmail(user.email);

  const active = orders.filter((o) => o.status !== "Delivered");
  const delivered = orders.filter((o) => o.status === "Delivered");
  const inTransit = orders.filter((o) => TRANSIT_STATUSES.includes(o.status));
  const paid = orders.filter((o) => o.payment === "Paid");
  const spend = paid.reduce((s, o) => s + o.total, 0);
  const avg = paid.length ? spend / paid.length : 0;

  // Status phase breakdown for the donut.
  const prep = orders.filter((o) => PREP_STATUSES.includes(o.status)).length;
  const phases = [
    { label: "En préparation", value: prep, color: "#f5b418" },
    { label: "En transit", value: inTransit.length, color: "#6366f1" },
    { label: "Livré", value: delivered.length, color: "#0b8457" },
  ].filter((p) => p.value > 0);

  // Destinations breakdown.
  const destMap = new Map<string, number>();
  for (const o of orders) {
    const route = `${COUNTRY_FR[o.origin]} → ${COUNTRY_FR[o.destination]}`;
    destMap.set(route, (destMap.get(route) ?? 0) + 1);
  }
  const routes = [...destMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const monthly = monthBuckets(orders);

  // Most recently booked active shipment for the focus card.
  const focus = active.length
    ? [...active].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  return (
    <div className="space-y-6">
      {/* ---- Greeting + quick actions ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Salut, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted mt-0.5">
            {active.length
              ? `Vous avez ${active.length} envoi${active.length > 1 ? "s" : ""} en cours.`
              : "Tout est livré — prêt pour le prochain."}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/book"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-dark active:scale-[0.97]"
          >
            <PlusIcon width={18} height={18} /> Envoyer un colis
          </Link>
          <Link
            href="/track"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold text-ink transition hover:border-brand/40 active:scale-[0.97]"
          >
            <SearchIcon width={18} height={18} className="text-brand" /> Suivi
          </Link>
        </div>
      </div>

      {/* ---- KPI row ---- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total envois" value={String(orders.length)} sub={`${active.length} actif${active.length > 1 ? "s" : ""}`} icon={<BoxIcon width={18} height={18} />} tone="brand" />
        <KpiCard label="En transit" value={String(inTransit.length)} sub="en cours d'acheminement" icon={<PlaneIcon width={18} height={18} />} tone="indigo" />
        <KpiCard label="Livrés" value={String(delivered.length)} sub={`${orders.length ? Math.round((delivered.length / orders.length) * 100) : 0} % de réussite`} icon={<CheckIcon width={18} height={18} />} tone="emerald" />
        <KpiCard label="Total dépensé" value={eur(spend)} sub={`moy. ${eur(avg)} / colis`} icon={<ChartIcon width={18} height={18} />} tone="amber" />
      </div>

      {/* ---- Active shipment focus ---- */}
      {focus && (
        <Link href={`/shipments/${focus.id}`} className="block group">
          <div className="relative overflow-hidden rounded-3xl bg-[#06301f] p-5 text-white shadow-lift transition group-hover:-translate-y-0.5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgba(11,132,87,0.85),transparent)]" aria-hidden />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                  <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" /> Envoi en cours
                </div>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
                  {STATUS_FR[focus.status]}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                  <TruckIcon width={28} height={28} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold leading-tight">
                    {COUNTRY_FR[focus.origin]} → {COUNTRY_FR[focus.destination]}
                  </p>
                  <p className="text-sm text-white/70">
                    {focus.trackingNumber} · {focus.band} · pour {focus.recipient.name}
                  </p>
                </div>
                <ArrowRightIcon width={20} height={20} className="hidden shrink-0 text-white/60 sm:block" />
              </div>
              <div className="mt-5">
                <PipelineProgress current={statusIndex(focus.status)} total={STATUSES.length} />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ---- Analytics grid ---- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Activité d'expédition</h2>
            <span className="text-xs font-medium text-muted">6 derniers mois</span>
          </div>
          <BarChart data={monthly} />
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink mb-4">Répartition des statuts</h2>
          {phases.length ? (
            <Donut segments={phases} centerValue={String(orders.length)} centerLabel="colis au total" />
          ) : (
            <p className="text-sm text-muted">Aucun envoi pour le moment.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink mb-4">Principaux trajets</h2>
          {routes.length ? <HBars data={routes} /> : <p className="text-sm text-muted">Aucun trajet pour le moment.</p>}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display font-bold text-ink mb-4">Résumé des dépenses</h2>
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="Dépenses totales" value={eur(spend)} />
            <MiniStat label="Moy. / colis" value={eur(avg)} />
            <MiniStat label="Commandes payées" value={String(paid.length)} />
          </div>
          <div className="mt-5 rounded-2xl bg-brand-light/50 p-4">
            <div className="flex items-center gap-2 text-sm text-ink">
              <ClockIcon width={16} height={16} className="text-brand" />
              {inTransit.length > 0 ? (
                <span>
                  <span className="font-semibold">{inTransit.length} colis</span> actuellement en transit entre la France et le Sénégal.
                </span>
              ) : (
                <span>Aucun colis en transit pour le moment.</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ---- Recent shipments ---- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink">Envois récents</h2>
          <Link href="/shipments" className="text-sm font-semibold text-brand">
            Voir tout →
          </Link>
        </div>
        <div className="space-y-3">
          {orders.slice(0, 4).map((o) => (
            <Link key={o.id} href={`/shipments/${o.id}`} className="block group">
              <Card className="p-4 flex items-center gap-3 group-hover:border-brand/40 transition">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <BoxIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink text-sm truncate">
                      {COUNTRY_FR[o.origin]} → {COUNTRY_FR[o.destination]} · {o.band}
                    </p>
                    <p className="font-bold text-ink text-sm shrink-0">{eur(o.total)}</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <PinIcon width={12} height={12} /> {o.trackingNumber} · {fmtDate(o.date)}
                  </p>
                  <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    <StatusBadge status={o.status} incident={o.incident} />
                    <PaymentBadge payment={o.payment} />
                  </div>
                </div>
                <ChevronRightIcon width={18} height={18} className="text-muted shrink-0" />
              </Card>
            </Link>
          ))}
          {orders.length === 0 && (
            <Card className="p-8 text-center">
              <BoxIcon width={32} height={32} className="mx-auto text-muted mb-2" />
              <p className="font-semibold text-ink">Aucun envoi pour le moment</p>
              <p className="text-sm text-muted mt-1 mb-4">Envoyez votre premier colis pour commencer.</p>
              <Link href="/book" className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white">
                <PlusIcon width={18} height={18} /> Envoyer un colis
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  brand: "bg-brand-light text-brand",
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES[tone]}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted mt-0.5">{sub}</p>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-background p-4 text-center">
      <p className="text-lg font-bold text-ink">{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}

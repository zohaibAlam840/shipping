import Link from "next/link";
import { PARTNERS, STATUSES, STATUS_FR, eur, fmtDate, COUNTRY_FR, type Order } from "@/lib/data";
import { getOrders, getClaims, getCustomers } from "@/lib/db";
import { Card, PageTitle, StatusBadge, PaymentBadge } from "@/components/ui";
import { Donut, BarChart, HBars } from "@/components/charts";
import {
  ChartIcon,
  BoxIcon,
  UsersIcon,
  AlertIcon,
  ChevronRightIcon,
  TruckIcon,
  PlaneIcon,
  CheckIcon,
} from "@/components/icons";

export const metadata = { title: "Admin" };
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

function monthRevenue(orders: Order[], months = 6) {
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
    if (o.payment !== "Paid") continue;
    const d = new Date(o.date);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].value += Math.round(o.total);
  }
  return buckets;
}

export default async function AdminPage() {
  const [orders, claims, customers] = await Promise.all([
    getOrders(),
    getClaims(),
    getCustomers(),
  ]);

  const paid = orders.filter((o) => o.payment === "Paid");
  const unpaid = orders.filter((o) => o.payment === "Unpaid");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const avgOrder = paid.length ? revenue / paid.length : 0;
  const active = orders.filter((o) => o.status !== "Delivered");
  const delivered = orders.filter((o) => o.status === "Delivered");
  const inTransit = orders.filter((o) => TRANSIT_STATUSES.includes(o.status));
  const incidents = orders.filter((o) => o.incident);
  const openClaims = claims.filter((c) => c.status === "Open" || c.status === "Investigating");
  const attention = orders.filter((o) => o.status === "Order Created" || o.incident);
  const deliveryRate = orders.length ? Math.round((delivered.length / orders.length) * 100) : 0;

  // Operational indicators.
  const now = new Date();
  const monthlyRevenue = paid
    .filter((o) => {
      const d = new Date(o.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, o) => s + o.total, 0);
  const upcomingWeight = active.reduce(
    (s, o) => s + (o.chargeableWeightKg ?? o.parcel.weightKg ?? 0),
    0,
  );
  const activeCustomers = new Set(active.map((o) => o.customerEmail)).size;
  // Count per workflow stage for the pipeline panel.
  const stageCounts = STATUSES.map((s) => ({
    status: s,
    count: orders.filter((o) => o.status === s).length,
  }));

  // Status phase donut.
  const prep = orders.filter((o) => PREP_STATUSES.includes(o.status)).length;
  const phases = [
    { label: "En préparation", value: prep, color: "#f5b418" },
    { label: "En transit", value: inTransit.length, color: "#6366f1" },
    { label: "Livré", value: delivered.length, color: "#0b8457" },
  ].filter((p) => p.value > 0);

  // Routes.
  const routeMap = new Map<string, number>();
  for (const o of orders) {
    const r = `${COUNTRY_FR[o.origin]} → ${COUNTRY_FR[o.destination]}`;
    routeMap.set(r, (routeMap.get(r) ?? 0) + 1);
  }
  const routes = [...routeMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const monthly = monthRevenue(orders);

  return (
    <div className="space-y-6">
      <PageTitle title="Vue d'ensemble" subtitle="En direct depuis la base de données" />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Chiffre d'affaires" value={eur(revenue)} sub={`moy. ${eur(avgOrder)} / commande`} icon={<ChartIcon width={18} height={18} />} tone="brand" />
        <KpiCard label="Commandes actives" value={String(active.length)} sub={`${orders.length} au total · ${inTransit.length} en transit`} icon={<BoxIcon width={18} height={18} />} tone="indigo" />
        <KpiCard label="Livrées" value={String(delivered.length)} sub={`${deliveryRate} % de livraison`} icon={<CheckIcon width={18} height={18} />} tone="emerald" />
        <KpiCard label="Réclamations ouvertes" value={String(openClaims.length)} sub={`${incidents.length} incident(s)`} icon={<AlertIcon width={18} height={18} />} tone="amber" />
      </div>

      {/* Operational indicators */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="CA du mois" value={eur(monthlyRevenue)} sub="commandes payées ce mois" icon={<ChartIcon width={18} height={18} />} tone="brand" />
        <KpiCard label="Poids à expédier" value={`${Math.round(upcomingWeight * 10) / 10} kg`} sub="colis non encore livrés" icon={<BoxIcon width={18} height={18} />} tone="indigo" />
        <KpiCard label="Clients actifs" value={String(activeCustomers)} sub={`${customers.length} clients au total`} icon={<UsersIcon width={18} height={18} />} tone="emerald" />
      </div>

      {/* Operational pipeline */}
      <Card className="p-5">
        <h2 className="font-display font-bold text-ink mb-4">Pipeline opérationnel</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          {stageCounts.map((s) => (
            <div key={s.status} className="flex items-center justify-between gap-3 border-b border-line/70 pb-2">
              <span className="text-sm text-muted">{STATUS_FR[s.status]}</span>
              <span className={`text-sm font-bold ${s.count ? "text-ink" : "text-muted/50"}`}>{s.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Chiffre d'affaires</h2>
            <span className="text-xs font-medium text-muted">6 derniers mois · commandes payées</span>
          </div>
          <BarChart data={monthly} valuePrefix="€" />
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink mb-4">Statut des commandes</h2>
          {phases.length ? (
            <Donut segments={phases} centerValue={String(orders.length)} centerLabel="commandes au total" />
          ) : (
            <p className="text-sm text-muted">Aucune commande pour le moment.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink mb-4">Principaux trajets</h2>
          {routes.length ? <HBars data={routes} /> : <p className="text-sm text-muted">Aucun trajet pour le moment.</p>}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display font-bold text-ink mb-4">Paiements et revenus</h2>
          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="Revenu total" value={eur(revenue)} />
            <MiniStat label="Moy. / commande" value={eur(avgOrder)} />
            <MiniStat label="Payées" value={String(paid.length)} />
            <MiniStat label="Impayées" value={String(unpaid.length)} />
          </div>
          {unpaid.length > 0 && (
            <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <AlertIcon width={16} height={16} />
                <span>
                  <span className="font-semibold">{unpaid.length} commande{unpaid.length > 1 ? "s" : ""}</span> en attente de paiement
                  ({eur(unpaid.reduce((s, o) => s + o.total, 0))} dû).
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Needs attention + Partners */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">À traiter</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand">Toutes les commandes →</Link>
          </div>
          <div className="space-y-3">
            {attention.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="block group">
                <Card className="p-4 flex items-center gap-3 group-hover:border-brand/40 transition">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink text-sm">
                      {o.orderNumber} · {o.customer}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {COUNTRY_FR[o.origin]} → {COUNTRY_FR[o.destination]} · {o.band} · {fmtDate(o.date)}
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
            {attention.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted">Rien à traiter. 🎉</Card>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">Partenaires</h2>
            <span className="text-xs font-medium text-muted">{customers.length} clients</span>
          </div>
          <div className="space-y-3">
            {PARTNERS.map((p) => {
              const activeCount = orders.filter(
                (o) => o.partner === p.name && o.status !== "Delivered",
              ).length;
              return (
                <Card key={p.name} className="p-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <TruckIcon width={20} height={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm">{p.name}</p>
                    <p className="text-xs text-muted">{p.region} · {activeCount} commande(s) active(s)</p>
                  </div>
                </Card>
              );
            })}
            <Card className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <PlaneIcon width={20} height={20} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{inTransit.length} colis en mouvement</p>
                <p className="text-xs text-muted">Corridor France → Sénégal</p>
              </div>
            </Card>
          </div>
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

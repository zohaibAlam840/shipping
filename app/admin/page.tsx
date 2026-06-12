import Link from "next/link";
import { PARTNERS, eur, fmtDate, type Order } from "@/lib/data";
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

const PREP_STATUSES = ["Pending Confirmation", "Parcel Received", "Processing"];
const TRANSIT_STATUSES = [
  "Shipped from France",
  "In Transit",
  "Arrived in Senegal",
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
  const attention = orders.filter((o) => o.status === "Pending Confirmation" || o.incident);
  const deliveryRate = orders.length ? Math.round((delivered.length / orders.length) * 100) : 0;

  // Status phase donut.
  const prep = orders.filter((o) => PREP_STATUSES.includes(o.status)).length;
  const phases = [
    { label: "Preparing", value: prep, color: "#f5b418" },
    { label: "In transit", value: inTransit.length, color: "#6366f1" },
    { label: "Delivered", value: delivered.length, color: "#0b8457" },
  ].filter((p) => p.value > 0);

  // Routes.
  const routeMap = new Map<string, number>();
  for (const o of orders) {
    const r = `${o.origin} → ${o.destination}`;
    routeMap.set(r, (routeMap.get(r) ?? 0) + 1);
  }
  const routes = [...routeMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const monthly = monthRevenue(orders);

  return (
    <div className="space-y-6">
      <PageTitle title="Operations overview" subtitle="Live from the database" />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue" value={eur(revenue)} sub={`avg ${eur(avgOrder)} / order`} icon={<ChartIcon width={18} height={18} />} tone="brand" />
        <KpiCard label="Active orders" value={String(active.length)} sub={`${orders.length} total · ${inTransit.length} in transit`} icon={<BoxIcon width={18} height={18} />} tone="indigo" />
        <KpiCard label="Delivered" value={String(delivered.length)} sub={`${deliveryRate}% delivery rate`} icon={<CheckIcon width={18} height={18} />} tone="emerald" />
        <KpiCard label="Open claims" value={String(openClaims.length)} sub={`${incidents.length} incident(s)`} icon={<AlertIcon width={18} height={18} />} tone="amber" />
      </div>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-ink">Revenue</h2>
            <span className="text-xs font-medium text-muted">Last 6 months · paid orders</span>
          </div>
          <BarChart data={monthly} valuePrefix="€" />
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink mb-4">Order status</h2>
          {phases.length ? (
            <Donut segments={phases} centerValue={String(orders.length)} centerLabel="total orders" />
          ) : (
            <p className="text-sm text-muted">No orders yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-display font-bold text-ink mb-4">Top routes</h2>
          {routes.length ? <HBars data={routes} /> : <p className="text-sm text-muted">No routes yet.</p>}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display font-bold text-ink mb-4">Payments & revenue</h2>
          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="Lifetime revenue" value={eur(revenue)} />
            <MiniStat label="Avg / order" value={eur(avgOrder)} />
            <MiniStat label="Paid" value={String(paid.length)} />
            <MiniStat label="Unpaid" value={String(unpaid.length)} />
          </div>
          {unpaid.length > 0 && (
            <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <AlertIcon width={16} height={16} />
                <span>
                  <span className="font-semibold">{unpaid.length} order{unpaid.length > 1 ? "s" : ""}</span> awaiting payment
                  ({eur(unpaid.reduce((s, o) => s + o.total, 0))} outstanding).
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
            <h2 className="font-display text-base font-bold text-ink">Needs attention</h2>
            <Link href="/admin/orders" className="text-sm font-semibold text-brand">All orders →</Link>
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
                      {o.origin} → {o.destination} · {o.band} · {fmtDate(o.date)}
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
              <Card className="p-8 text-center text-sm text-muted">Nothing needs attention. 🎉</Card>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">Partners</h2>
            <span className="text-xs font-medium text-muted">{customers.length} customers</span>
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
                    <p className="text-xs text-muted">{p.type} · {activeCount} active orders</p>
                  </div>
                </Card>
              );
            })}
            <Card className="p-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <PlaneIcon width={20} height={20} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm">{inTransit.length} parcels moving</p>
                <p className="text-xs text-muted">France ↔ Senegal corridor</p>
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

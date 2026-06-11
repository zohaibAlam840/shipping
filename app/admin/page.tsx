import Link from "next/link";
import { PARTNERS, eur, fmtDate } from "@/lib/data";
import { getOrders, getClaims, getCustomers } from "@/lib/db";
import { Card, PageTitle, Stat, StatusBadge, PaymentBadge } from "@/components/ui";
import { ChartIcon, BoxIcon, UsersIcon, AlertIcon, ChevronRightIcon, TruckIcon } from "@/components/icons";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [orders, claims, customers] = await Promise.all([
    getOrders(),
    getClaims(),
    getCustomers(),
  ]);
  const revenue = orders.filter((o) => o.payment === "Paid").reduce((s, o) => s + o.total, 0);
  const active = orders.filter((o) => o.status !== "Delivered");
  const incidents = orders.filter((o) => o.incident);
  const openClaims = claims.filter((c) => c.status === "Open" || c.status === "Investigating");
  const attention = orders.filter((o) => o.status === "Pending Confirmation" || o.incident);

  return (
    <div>
      <PageTitle title="Operations overview" subtitle="Live from the database" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Revenue" value={eur(revenue)} hint="paid orders" icon={<ChartIcon width={18} height={18} />} />
        <Stat label="Active orders" value={String(active.length)} hint={`${orders.length} total`} icon={<BoxIcon width={18} height={18} />} />
        <Stat label="Customers" value={String(customers.length)} icon={<UsersIcon width={18} height={18} />} />
        <Stat label="Open claims" value={String(openClaims.length)} hint={`${incidents.length} incident(s)`} icon={<AlertIcon width={18} height={18} />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-ink">Needs attention</h2>
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
          <h2 className="text-base font-bold text-ink mb-3">Partners</h2>
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
          </div>
        </div>
      </div>
    </div>
  );
}

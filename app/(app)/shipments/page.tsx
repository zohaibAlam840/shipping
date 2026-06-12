import Link from "next/link";
import { eur, fmtDate } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { getOrdersByEmail } from "@/lib/db";
import { Card, PageTitle, StatusBadge, PaymentBadge } from "@/components/ui";
import { BoxIcon, ChevronRightIcon, PlusIcon } from "@/components/icons";

export const metadata = { title: "My shipments" };
export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const user = await requireUser();
  const orders = await getOrdersByEmail(user.email);
  return (
    <div>
      <PageTitle
        title="My shipments"
        subtitle={`${orders.length} total`}
        action={
          <Link
            href="/book"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark transition"
          >
            <PlusIcon width={17} height={17} /> New
          </Link>
        }
      />
      <div className="space-y-3">
        {orders.map((o) => (
          <Link key={o.id} href={`/shipments/${o.id}`} className="block group">
            <Card className="p-4 group-hover:border-brand/40 transition">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <BoxIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink text-sm truncate">
                      {o.origin} → {o.destination}
                    </p>
                    <p className="font-bold text-ink text-sm">{eur(o.total)}</p>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {o.orderNumber} · {o.band} · {fmtDate(o.date)}
                  </p>
                </div>
                <ChevronRightIcon width={18} height={18} className="text-muted shrink-0" />
              </div>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <StatusBadge status={o.status} incident={o.incident} />
                <PaymentBadge payment={o.payment} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

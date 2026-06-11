import Link from "next/link";
import { fmtDate } from "@/lib/data";
import { getOrdersByPartner } from "@/lib/db";
import { Card, PageTitle, StatusBadge } from "@/components/ui";
import { BoxIcon, ChevronRightIcon, PinIcon } from "@/components/icons";

export const metadata = { title: "Partner workspace" };
export const dynamic = "force-dynamic";

// Demo: the signed-in partner is DakarExpress 3PL
const PARTNER_NAME = "DakarExpress 3PL";

export default async function PartnerPage() {
  const assigned = await getOrdersByPartner(PARTNER_NAME);
  return (
    <div>
      <PageTitle
        title="Assigned shipments"
        subtitle={`${PARTNER_NAME} · ${assigned.length} order(s)`}
      />
      <div className="space-y-3">
        {assigned.map((o) => (
          <Link key={o.id} href={`/partner/orders/${o.id}`} className="block group">
            <Card className="p-4 group-hover:border-brand/40 transition">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                  <BoxIcon width={22} height={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink text-sm">
                    {o.orderNumber} · {o.band}
                  </p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <PinIcon width={12} height={12} /> {o.recipient.address}
                  </p>
                  <p className="text-xs text-muted mt-0.5">Booked {fmtDate(o.date)}</p>
                  <div className="mt-1.5">
                    <StatusBadge status={o.status} incident={o.incident} />
                  </div>
                </div>
                <ChevronRightIcon width={18} height={18} className="text-muted shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
        {assigned.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted">No shipments assigned right now.</Card>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/db";
import { Card, PageTitle, StatusBadge, Timeline } from "@/components/ui";
import { PartnerControls } from "./partner-controls";

export const dynamic = "force-dynamic";

export default async function PartnerOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/partner" className="text-sm font-semibold text-brand">
        ← Assigned shipments
      </Link>
      <div className="mt-3">
        <PageTitle
          title={order.orderNumber}
          subtitle={`${order.band} · ${order.delivery}`}
        />
      </div>
      <div className="mb-4">
        <StatusBadge status={order.status} incident={order.incident} />
      </div>

      <Card className="p-5 mb-4">
        <h2 className="font-bold text-ink mb-3">Deliver to</h2>
        <p className="font-semibold text-ink text-sm">{order.recipient.name}</p>
        <p className="text-sm text-muted">{order.recipient.phone}</p>
        <p className="text-sm text-muted">{order.recipient.address}</p>
      </Card>

      <PartnerControls order={order} />

      <Card className="p-5">
        <h2 className="font-bold text-ink mb-4">History</h2>
        <Timeline log={order.log} current={order.status} />
      </Card>
    </div>
  );
}

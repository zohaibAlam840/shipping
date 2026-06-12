import Link from "next/link";
import { notFound } from "next/navigation";
import { eur, fmtDate } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { getOrderById } from "@/lib/db";
import { Card, PageTitle, StatusBadge, PaymentBadge, Timeline } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderById(id);
  // Only the owner may view their shipment.
  if (!order || order.customerEmail !== user.email) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/shipments" className="text-sm font-semibold text-brand">
        ← All shipments
      </Link>
      <div className="mt-3">
        <PageTitle
          title={`${order.origin} → ${order.destination}`}
          subtitle={`${order.orderNumber} · booked ${fmtDate(order.date)}`}
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <StatusBadge status={order.status} incident={order.incident} />
        <PaymentBadge payment={order.payment} />
      </div>

      <Card className="p-5 mb-4">
        <h2 className="font-bold text-ink mb-4">Tracking</h2>
        <p className="text-xs text-muted mb-4">
          Tracking number{" "}
          <span className="font-mono font-bold text-ink">{order.trackingNumber}</span>
        </p>
        <Timeline log={order.log} current={order.status} />
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-bold text-ink mb-3">Recipient</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted text-xs">Name</dt><dd className="font-semibold text-ink">{order.recipient.name}</dd></div>
            <div><dt className="text-muted text-xs">Phone</dt><dd className="font-semibold text-ink">{order.recipient.phone}</dd></div>
            <div><dt className="text-muted text-xs">Address</dt><dd className="font-semibold text-ink">{order.recipient.address}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-ink mb-3">Parcel & price</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted text-xs">Contents</dt><dd className="font-semibold text-ink">{order.parcel.description}</dd></div>
            <div><dt className="text-muted text-xs">Weight / size</dt><dd className="font-semibold text-ink">{order.parcel.weightKg} kg · {order.parcel.dimensions}</dd></div>
            <div><dt className="text-muted text-xs">Delivery option</dt><dd className="font-semibold text-ink">{order.delivery}</dd></div>
            <div><dt className="text-muted text-xs">Insurance</dt><dd className="font-semibold text-ink">{order.insurance ? `Yes — value ${eur(order.parcel.declaredValue)}` : "No"}</dd></div>
            <div className="pt-2 border-t border-line flex items-center justify-between">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-xl font-bold text-brand">{eur(order.total)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { eur, fmtDate, COUNTRY_FR } from "@/lib/data";
import { getOrderById } from "@/lib/db";
import { Card, PageTitle, StatusBadge, PaymentBadge, Timeline } from "@/components/ui";
import { ManageOrderForm } from "./manage-form";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/orders" className="text-sm font-semibold text-brand">
        ← Toutes les commandes
      </Link>
      <div className="mt-3">
        <PageTitle
          title={order.orderNumber}
          subtitle={`${order.customer} · réservé le ${fmtDate(order.date)} · ${eur(order.total)}`}
        />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <StatusBadge status={order.status} incident={order.incident} />
        <PaymentBadge payment={order.payment} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-bold text-ink mb-4">Gérer la commande</h2>
          <ManageOrderForm order={order} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold text-ink mb-3">Envoi</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted text-xs">Trajet</dt><dd className="font-semibold text-ink">{COUNTRY_FR[order.origin]} → {COUNTRY_FR[order.destination]} · {order.band}</dd></div>
              <div><dt className="text-muted text-xs">Contenu</dt><dd className="font-semibold text-ink">{order.parcel.description} · {order.parcel.weightKg} kg</dd></div>
              <div><dt className="text-muted text-xs">Destinataire</dt><dd className="font-semibold text-ink">{order.recipient.name} · {order.recipient.phone}</dd></div>
              <div><dt className="text-muted text-xs">Adresse</dt><dd className="font-semibold text-ink">{order.recipient.address}</dd></div>
              <div><dt className="text-muted text-xs">Suivi</dt><dd className="font-mono font-semibold text-ink">{order.trackingNumber}</dd></div>
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold text-ink mb-4">Historique</h2>
            <Timeline log={order.log} current={order.status} />
          </Card>
        </div>
      </div>
    </div>
  );
}

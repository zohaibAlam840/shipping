import Link from "next/link";
import { notFound } from "next/navigation";
import { eur, fmtDate, COUNTRY_FR, DELIVERY_FR } from "@/lib/data";
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
        ← Tous les envois
      </Link>
      <div className="mt-3">
        <PageTitle
          title={`${COUNTRY_FR[order.origin]} → ${COUNTRY_FR[order.destination]}`}
          subtitle={`${order.orderNumber} · réservé le ${fmtDate(order.date)}`}
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <StatusBadge status={order.status} incident={order.incident} />
        <PaymentBadge payment={order.payment} />
      </div>

      <Card className="p-5 mb-4">
        <h2 className="font-bold text-ink mb-4">Suivi</h2>
        <p className="text-xs text-muted mb-4">
          Numéro de suivi{" "}
          <span className="font-mono font-bold text-ink">{order.trackingNumber}</span>
        </p>
        <Timeline log={order.log} current={order.status} />
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-bold text-ink mb-3">Destinataire</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted text-xs">Nom</dt><dd className="font-semibold text-ink">{order.recipient.name}</dd></div>
            <div><dt className="text-muted text-xs">Téléphone</dt><dd className="font-semibold text-ink">{order.recipient.phone}</dd></div>
            <div><dt className="text-muted text-xs">Adresse</dt><dd className="font-semibold text-ink">{order.recipient.address}</dd></div>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold text-ink mb-3">Colis et prix</h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted text-xs">Contenu</dt><dd className="font-semibold text-ink">{order.parcel.description}</dd></div>
            <div><dt className="text-muted text-xs">Poids / taille</dt><dd className="font-semibold text-ink">{order.parcel.weightKg} kg · {order.parcel.dimensions}</dd></div>
            <div><dt className="text-muted text-xs">Option de livraison</dt><dd className="font-semibold text-ink">{DELIVERY_FR[order.delivery]}</dd></div>
            <div><dt className="text-muted text-xs">Assurance</dt><dd className="font-semibold text-ink">{order.insurance ? `Oui — valeur ${eur(order.parcel.declaredValue)}` : "Non"}</dd></div>
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

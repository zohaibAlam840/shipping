import Link from "next/link";
import { notFound } from "next/navigation";
import { eur, fmtDate, COUNTRY_FR, DELIVERY_FR } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { getOrderById } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";
import { Card, PageTitle, StatusBadge, PaymentBadge, Timeline } from "@/components/ui";
import { PayButton } from "@/components/pay-button";
import { CheckIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ShipmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paye?: string }>;
}) {
  const { id } = await params;
  const { paye } = await searchParams;
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

      {paye === "1" && order.payment !== "Paid" && (
        <Card className="p-4 mb-4 border-brand/30 bg-brand-light/50">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <CheckIcon width={18} height={18} className="text-brand" />
            Paiement reçu — la confirmation sera mise à jour dans un instant.
          </p>
        </Card>
      )}

      {order.payment === "Unpaid" && (
        <Card className="p-5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">Paiement</p>
              <p className="text-sm text-muted">
                Montant à régler : <span className="font-bold text-ink">{eur(order.total)}</span>
              </p>
            </div>
            {isStripeConfigured() ? (
              <PayButton orderId={order.id} />
            ) : (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">
                À régler au dépôt (paiement en ligne bientôt)
              </span>
            )}
          </div>
        </Card>
      )}

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
            {order.dropoffPoint && (
              <div><dt className="text-muted text-xs">Point de dépôt</dt><dd className="font-semibold text-ink">{order.dropoffPoint}</dd></div>
            )}
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

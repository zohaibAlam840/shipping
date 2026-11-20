// Printable QR labels for one order's parcels (SN-NAT-05, AT-03).
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth";
import { getOrderById } from "@/lib/db";
import { getParcelsByOrder } from "@/lib/parcels";
import { getAppUser } from "@/lib/roles";
import { PageTitle } from "@/components/ui";
import { ParcelLabels, type LabelData } from "@/components/parcel-labels";

export const metadata = { title: "Étiquettes" };
export const dynamic = "force-dynamic";

export default async function LabelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const order = await getOrderById(id);
  if (!order) notFound();

  // Only the sender (or staff) may print labels for their own shipment.
  const appUser = await getAppUser();
  const isStaff = Boolean(appUser && appUser.role !== "customer");
  if (order.customerEmail !== user.email && !isStaff) redirect("/shipments");

  const parcels = await getParcelsByOrder(id);

  // The QR carries the opaque token only — no personal data (SN-SCAN-01).
  const labels: LabelData[] = await Promise.all(
    parcels.map(async (p) => ({
      parcelRef: p.parcelRef,
      qrSvg: await QRCode.toString(p.qrToken, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      }),
      seq: p.seq,
      totalParcels: parcels.length,
      weightKg: p.weightKg,
      dimensions: p.dimensions,
      contents: p.declaredContents,
      orderNumber: order.orderNumber,
      senderName: order.customer,
      recipientName: order.recipient.name,
      recipientPhone: order.recipient.phone,
      destination: order.recipient.address.slice(0, 40),
    })),
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <Link href={`/shipments/${id}`} className="text-sm font-semibold text-brand print:hidden">
        ← Retour à l&apos;envoi
      </Link>
      <div className="mt-3 mb-5 print:hidden">
        <PageTitle
          title="Étiquettes des colis"
          subtitle={`${order.orderNumber} · ${parcels.length} colis`}
        />
      </div>

      {parcels.length === 0 ? (
        <p className="rounded-xl border border-line p-6 text-center text-sm text-muted">
          Aucun colis rattaché à cet envoi.
        </p>
      ) : (
        <ParcelLabels labels={labels} />
      )}
    </div>
  );
}

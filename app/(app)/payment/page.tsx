import { redirect } from "next/navigation";
import { eur, COUNTRY_FR } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { getOrderById } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";
import { PaymentResult } from "@/components/payment-result";

export const dynamic = "force-dynamic";

// Stripe Checkout redirects here:
//   success → /payment?status=success&order=<id>
//   cancel  → /payment?status=cancel&order=<id>
export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; order?: string }>;
}) {
  const { status, order: orderId } = await searchParams;
  const user = await requireUser();

  if (!orderId) redirect("/dashboard");
  const order = await getOrderById(orderId);
  // Only the owner may see their payment result.
  if (!order || order.customerEmail !== user.email) redirect("/dashboard");

  return (
    <PaymentResult
      kind={status === "cancel" ? "cancel" : "success"}
      paid={order.payment === "Paid"}
      orderId={order.id}
      orderNumber={order.orderNumber}
      totalLabel={eur(order.total)}
      routeLabel={`${COUNTRY_FR[order.origin]} → ${COUNTRY_FR[order.destination]}`}
      stripeEnabled={isStripeConfigured()}
    />
  );
}

// Stripe webhook: marks an order as Paid when its Checkout session completes.
// Configure the endpoint URL + signing secret in the Stripe dashboard.
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sendStatusEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Webhook signature error: ${e instanceof Error ? e.message : "unknown"}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { metadata?: { order_id?: string } };
    const orderId = session.metadata?.order_id;
    if (orderId) {
      const db = supabaseAdmin();
      await db.from("orders").update({ payment: "Paid" }).eq("id", orderId);
      // Advance the workflow to "Payment Received" if still at the start.
      const { data: o } = await db
        .from("orders")
        .select("status, customer_email, customer_name, order_number")
        .eq("id", orderId)
        .single();
      if (o?.status === "Order Created") {
        await db.from("orders").update({ status: "Payment Received" }).eq("id", orderId);
        await db.from("status_log").insert({
          order_id: orderId,
          status: "Payment Received",
          by_who: "Paiement Stripe",
        });
        void sendStatusEmail(o.customer_email, o.customer_name, o.order_number, "Payment Received");
      }
    }
  }

  return new Response("ok", { status: 200 });
}

// Stripe webhook: marks an order as Paid when its Checkout session completes.
// Configure the endpoint URL + signing secret in the Stripe dashboard
// (or via `stripe listen` locally). See DEPLOYMENT.md.
import type Stripe from "stripe";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { sendStatusEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mark an order paid + advance the workflow. Idempotent: safe to run twice
// (Stripe can deliver the same event more than once), because it only acts
// when the order isn't already Paid.
async function markOrderPaid(orderId: string) {
  const db = supabaseAdmin();
  const { data: o } = await db
    .from("orders")
    .select("status, payment, customer_email, customer_name, order_number")
    .eq("id", orderId)
    .single();

  if (!o) return;
  if (o.payment === "Paid") return; // already processed → no-op

  await db.from("orders").update({ payment: "Paid" }).eq("id", orderId);

  // Advance the workflow to "Payment Received" if still at the start.
  if (o.status === "Order Created") {
    await db.from("orders").update({ status: "Payment Received" }).eq("id", orderId);
    await db.from("status_log").insert({
      order_id: orderId,
      status: "Payment Received",
      by_who: "Paiement Stripe",
    });
    void sendStatusEmail(o.customer_email, o.customer_name, o.order_number, "Payment Received");
  }
}

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe not configured", { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Webhook signature error: ${e instanceof Error ? e.message : "unknown"}`, {
      status: 400,
    });
  }

  switch (event.type) {
    // Card payment finished immediately, or a delayed method (e.g. bank debit)
    // finally cleared — both mean the money is in.
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      // For async methods, `completed` can arrive while still unpaid; only act
      // once Stripe reports the session as actually paid.
      if (session.payment_status === "paid") {
        const orderId = session.metadata?.order_id;
        if (orderId) await markOrderPaid(orderId);
      }
      break;
    }
    default:
      // Other events are acknowledged but ignored.
      break;
  }

  return new Response("ok", { status: 200 });
}

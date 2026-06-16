"use server";

// Stripe Checkout for paying an order online.
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { stripe, isStripeConfigured, appUrl } from "@/lib/stripe";

export async function createCheckout(orderId: string): Promise<{ url?: string; error?: string }> {
  if (!isStripeConfigured()) {
    return { error: "Le paiement en ligne n'est pas encore activé." };
  }

  const user = await getSessionUser();
  if (!user) return { error: "Veuillez vous connecter." };

  const db = supabaseAdmin();
  const { data: order, error } = await db
    .from("orders")
    .select("id, order_number, total, payment, customer_email")
    .eq("id", orderId)
    .single();

  if (error || !order) return { error: "Commande introuvable." };
  if (order.customer_email !== user.email) return { error: "Accès refusé." };
  if (order.payment === "Paid") return { error: "Cette commande est déjà payée." };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(Number(order.total) * 100),
            product_data: {
              name: `Envoi YonelMa ${order.order_number}`,
              description: "Expédition de colis France → Sénégal",
            },
          },
        },
      ],
      metadata: { order_id: order.id, order_number: order.order_number },
      success_url: `${appUrl()}/shipments/${order.id}?paye=1`,
      cancel_url: `${appUrl()}/shipments/${order.id}`,
    });
    return { url: session.url ?? undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur de paiement." };
  }
}

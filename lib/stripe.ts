// Server-only Stripe client. Online payment activates automatically once
// STRIPE_SECRET_KEY is set in the environment — until then the app treats
// "pay online" as not-yet-available and falls back to pay-on-drop-off.
import Stripe from "stripe";

/**
 * Phase 1 payment freeze (spec §2, §10): "no live customer payments during
 * this phase". Online payment therefore stays OFF unless it is explicitly
 * switched on with PAYMENTS_ENABLED=true, even when Stripe keys are present
 * in the environment. The France → Senegal commercial model is also frozen
 * pending legal review (§9, Legal Gate G0).
 */
export function arePaymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}

export function isStripeConfigured(): boolean {
  return arePaymentsEnabled() && Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!client) {
    // Pin the API version so Stripe behaviour stays stable across SDK upgrades.
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
      typescript: true,
    });
  }
  return client;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

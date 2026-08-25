import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Server-only Stripe client. STRIPE_SECRET_KEY must never reach the
 * browser — only NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is exposed client-side
 * (see src/lib/stripe/public.ts).
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set — billing is unavailable.");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-07-29.dahlia",
    });
  }
  return stripeClient;
}

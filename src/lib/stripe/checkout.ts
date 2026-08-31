import { getStripeClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { pricing } from "@/lib/config/pricing";

async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const admin = createAdminClient();
  const stripe = getStripeClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await admin
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);

  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  if (!pricing.premium.priceId) {
    throw new Error("NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID is not configured.");
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateStripeCustomer(params.userId, params.email);

  const session = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: pricing.premium.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      subscription_data: { trial_period_days: 7, metadata: { userId: params.userId } },
      metadata: { userId: params.userId },
      allow_promotion_codes: true,
      // Stripe Tax: calculates and collects the right tax for the
      // customer's location automatically. Requires Stripe Tax to be
      // enabled and an origin address set in the Dashboard (Settings > Tax)
      // — until then Stripe just skips tax calculation, so this is safe to
      // leave on unconditionally.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { name: "auto", address: "auto" },
    },
    // Idempotency key: if this request is retried (network blip, double
    // click before the button disables), Stripe returns the original
    // session instead of creating a second one for the same user+price.
    { idempotencyKey: `checkout_${params.userId}_${pricing.premium.priceId}_${Date.now() / 60_000 | 0}` }
  );

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

export async function createPortalSession(params: { userId: string; returnUrl: string }): Promise<string> {
  const admin = createAdminClient();
  const stripe = getStripeClient();

  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    throw new Error("No Stripe customer on file for this user.");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: params.returnUrl,
  });

  return session.url;
}

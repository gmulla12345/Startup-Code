import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { getStripeClient } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/api/auth";
import {
  isStudentPlanConfigured,
  premiumPriceId,
  studentPriceId,
  type BillingInterval,
  type CheckoutPlan,
} from "@/lib/config/pricing";
import { studentPromoRequiresCard } from "@/lib/config/promo";
import { FOUNDING_SESSION_MINUTES } from "@/lib/config/founding";
import { releaseFoundingSlot, reserveFoundingSlot } from "@/lib/founding/offer";
import { assertVerifiedStudent, STUDENT_PLAN_MESSAGES } from "./student-plan";
import {
  attachSessionToClaim,
  claimStudentPromo,
  evaluatePromoCode,
  expireCheckoutSession,
} from "./promo";

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
  billingInterval?: BillingInterval;
  /** "student" is the lower price for verified students: monthly only, checked here before anything is created. */
  plan?: CheckoutPlan;
  endorselyReferral?: string;
  /** A code the person typed. Checked on the server (lib/stripe/promo.ts) before it touches Stripe. */
  promoCode?: string;
}): Promise<string> {
  const interval = params.billingInterval ?? "monthly";
  const plan = params.plan ?? "premium";

  // The student price is judged before anything is created: an account that cannot have
  // it, or a plan that is not on sale yet, stops here, with a message, and no customer
  // or session is made. The browser names the plan; the price id is chosen only here.
  if (plan === "student") {
    if (!isStudentPlanConfigured()) throw new ApiError(503, STUDENT_PLAN_MESSAGES.unavailable);
    if (interval !== "monthly") throw new ApiError(400, STUDENT_PLAN_MESSAGES.monthlyOnly);
    await assertVerifiedStudent(params.userId);
  }
  // The student price may have a limit (see lib/founding/offer.ts). If it does, a spot is held for this person while they
  // check out, in one step with the count, so the last one cannot be sold twice; if it is full this throws and nothing is made.
  const founding = plan === "student" ? (await reserveFoundingSlot(params.userId)).capped : false;

  const priceId = plan === "student" ? studentPriceId() : premiumPriceId(interval);
  if (!priceId) {
    throw new Error(
      interval === "annual"
        ? "NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID is not configured."
        : "NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID is not configured."
    );
  }

  const stripe = getStripeClient();

  // A code is judged before anything is created: an unusable one stops here, with
  // a message for the person, and no customer or session is made for it.
  const promo = params.promoCode
    ? await evaluatePromoCode({ userId: params.userId, code: params.promoCode, interval })
    : null;

  const customerId = await getOrCreateStripeCustomer(params.userId, params.email);

  // A student code reserves the one free month this person gets.
  const claim =
    promo?.kind === "student"
      ? await claimStudentPromo({ userId: params.userId, code: promo.code, promotionCodeId: promo.promotionCodeId })
      : null;

  // Endorsely (affiliate-click tracking, see src/components/shared/endorsely.tsx)
  // asks for its referral id in the session's metadata so it can attribute
  // this sale. Also duplicated onto subscription_data.metadata, same as
  // userId already is below — Stripe invoices for renewals inherit the
  // subscription's metadata, not the checkout session's, so only setting it
  // on the session would lose attribution after the first payment.
  const endorselyMetadata: Record<string, string> = params.endorselyReferral
    ? { endorsely_referral: params.endorselyReferral }
    : {};

  // One minute bucket for the whole request: the idempotency key below and, for a founding checkout, its closing time.
  const minute = (Date.now() / 60_000) | 0;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      // The free month of a student code replaces the standard 7-day trial; the
      // two are never stacked.
      ...(claim ? {} : { trial_period_days: 7 }),
      metadata: {
        userId: params.userId,
        ...endorselyMetadata,
        ...(promo ? { promo_code: promo.code } : {}),
        ...(plan === "student" ? { plan: "student" } : {}),
      },
    },
    // promo_claim is how the webhook knows this session carried a reserved student
    // code. Only this server can set metadata, so a customer cannot forge it.
    metadata: {
      userId: params.userId,
      ...endorselyMetadata,
      ...(promo ? { promo_code: promo.code } : {}),
      ...(claim ? { promo_claim: claim.id } : {}),
      ...(plan === "student" ? { plan: "student" } : {}),
    },
    // A code is applied here, by the server, after its checks. Stripe's own
    // promotion-code box is deliberately not offered (allow_promotion_codes
    // stays off): a student code typed into it would skip the verified-student
    // check, which Stripe cannot make.
    ...(promo ? { discounts: [{ promotion_code: promo.promotionCodeId }] } : {}),
    ...(claim ? { payment_method_collection: studentPromoRequiresCard() ? "always" : "if_required" } : {}),
    // Stripe Tax: calculates and collects the right tax for the
    // customer's location automatically. Requires Stripe Tax to be
    // enabled and an origin address set in the Dashboard (Settings > Tax)
    // — until then Stripe just skips tax calculation, so this is safe to
    // leave on unconditionally.
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    customer_update: { name: "auto", address: "auto" },
    // A founding checkout closes on its own, so the spot it holds is given back. Computed from the minute bucket, not the clock, so a
    // retry within the minute sends exactly the same request (Stripe refuses a repeated key with different parameters).
    ...(founding ? { expires_at: (minute + FOUNDING_SESSION_MINUTES) * 60 } : {}),
  };

  // Idempotency key, derived from the request itself: a retry of the SAME request
  // within the minute (network blip, double click before the button disables)
  // gets Stripe's original session back instead of a second one, and a request
  // that differs in any way (another code, plan, or setting) gets a new session
  // instead of Stripe's "same key, different parameters" error.
  const fingerprint = createHash("sha256").update(JSON.stringify(sessionParams)).digest("hex").slice(0, 32);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `checkout_${fingerprint}_${minute}`,
    });
  } catch (err) {
    // No checkout was made, so the spot held for it is given back.
    if (founding) await releaseFoundingSlot(params.userId);
    throw err;
  }

  if (!session.url) throw new Error("Stripe did not return a checkout URL.");

  if (claim) {
    await attachSessionToClaim(claim.id, session.id);
    // Close this person's earlier unfinished checkout so two cannot both complete,
    // but only now that the new one exists, and never when Stripe handed back the
    // very same session (a retry), which must stay open.
    if (claim.previousSessionId && claim.previousSessionId !== session.id) {
      await expireCheckoutSession(claim.previousSessionId);
    }
  }
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

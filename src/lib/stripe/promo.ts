import type Stripe from "stripe";
import { ApiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeCode } from "@/lib/attribution";
import { STRIPE_PROMO_CODE, STUDENT_COUPON_ID, STUDENT_PROMO_INTERVAL } from "@/lib/config/promo";
import type { BillingInterval } from "@/lib/config/pricing";
import { getStripeClient } from "./client";

/**
 * Deciding whether a promo code may be applied at checkout, on the server.
 *
 * Stripe enforces a code's redemption limit and expiry, but it cannot know whether
 * the person holding a code is a verified student, so every code is checked here
 * BEFORE it is attached to a Checkout Session. The checkout never shows Stripe's
 * own promotion-code box (a customer could type a student code there and skip
 * these checks), so this is the only way a code is applied.
 *
 * A "student" code is any promotion code that points at STUDENT_COUPON_ID. For
 * those, all of these must hold, in this order:
 *   - the code carries a redemption limit, an expiry and the first-time-customer
 *     restriction (a hand-made code without them is refused, not trusted),
 *   - it has not expired, is not used up, and is active,
 *   - the plan is monthly (the coupon is 100% off the first invoice, which on an
 *     annual price would be a free year),
 *   - the account has a verified school email (profiles.edu_verified_at),
 *   - the account has not already redeemed a student code (one use per person),
 *   - the account has never subscribed or paid (first-time customers only).
 * Any other promotion code is passed through for Stripe to judge.
 */

export const PROMO_MESSAGES = {
  invalid: "That code is not valid.",
  expired: "That code has expired.",
  usedUp: "That code has reached its limit.",
  monthlyOnly: "Student codes apply to monthly Premium. Choose monthly to use one.",
  notVerified: "Student codes are for verified school email addresses. Confirm yours from the link we sent, then try again.",
  alreadyUsed: "You have already used a student code.",
  notFirstTime: "Student codes are for first-time subscribers.",
} as const;

export type PromoResolution =
  | { kind: "student"; code: string; promotionCodeId: string }
  | { kind: "other"; code: string; promotionCodeId: string };

async function findPromotionCode(code: string): Promise<Stripe.PromotionCode | null> {
  // Stripe matches the code case-insensitively. Prefer the active one if the
  // same code was ever reused; otherwise report on whatever exists (an expired
  // code is not "active", and deserves a better message than "not valid").
  const { data } = await getStripeClient().promotionCodes.list({ code, limit: 10 });
  return data.find((p) => p.active) ?? data[0] ?? null;
}

function couponIdOf(promo: Stripe.PromotionCode): string | null {
  const coupon = promo.promotion.coupon;
  return typeof coupon === "string" ? coupon : (coupon?.id ?? null);
}

function assertStudentCodeUsable(promo: Stripe.PromotionCode, nowMs: number): void {
  if (promo.max_redemptions == null || promo.expires_at == null || !promo.restrictions.first_time_transaction) {
    console.error(
      `[promo] ${promo.code} uses the student coupon but lacks a redemption limit, an expiry or the first-time restriction. Refusing it. Create student codes with: npm run promo-codes`
    );
    throw new ApiError(400, PROMO_MESSAGES.invalid);
  }
  if (promo.expires_at * 1000 <= nowMs) throw new ApiError(400, PROMO_MESSAGES.expired);
  if (promo.times_redeemed >= promo.max_redemptions) throw new ApiError(400, PROMO_MESSAGES.usedUp);
  if (!promo.active) throw new ApiError(400, PROMO_MESSAGES.invalid);
}

async function assertStudentEligible(userId: string): Promise<void> {
  const admin = createAdminClient();
  const [profile, subscription, payment, redemption] = await Promise.all([
    admin.from("profiles").select("edu_verified_at").eq("user_id", userId).maybeSingle(),
    admin.from("subscriptions").select("stripe_subscription_id, digistore24_order_id").eq("user_id", userId).maybeSingle(),
    admin.from("payments").select("id").eq("user_id", userId).eq("status", "paid").limit(1),
    admin.from("promo_redemptions").select("status").eq("user_id", userId).maybeSingle(),
  ]);

  // Fail closed: if the account cannot be read, no code is applied.
  for (const result of [profile, subscription, payment, redemption]) {
    if (result.error) throw new Error(`[promo] could not check eligibility: ${result.error.message}`);
  }

  if (!profile.data?.edu_verified_at) throw new ApiError(403, PROMO_MESSAGES.notVerified);
  if (redemption.data?.status === "redeemed") throw new ApiError(409, PROMO_MESSAGES.alreadyUsed);
  if (subscription.data?.stripe_subscription_id || subscription.data?.digistore24_order_id || (payment.data?.length ?? 0) > 0) {
    throw new ApiError(409, PROMO_MESSAGES.notFirstTime);
  }
}

/**
 * Decides what a typed code means for this account and plan, with no side effects.
 * Throws an ApiError with a message fit to show the person when it cannot be used.
 */
export async function evaluatePromoCode(params: {
  userId: string;
  code: string;
  interval: BillingInterval;
  now?: Date;
}): Promise<PromoResolution> {
  const code = sanitizeCode(params.code);
  if (!code || !STRIPE_PROMO_CODE.test(code)) throw new ApiError(400, PROMO_MESSAGES.invalid);

  const promo = await findPromotionCode(code);
  if (!promo) throw new ApiError(400, PROMO_MESSAGES.invalid);

  if (couponIdOf(promo) !== STUDENT_COUPON_ID) {
    if (!promo.active) throw new ApiError(400, PROMO_MESSAGES.invalid);
    return { kind: "other", code, promotionCodeId: promo.id };
  }

  assertStudentCodeUsable(promo, (params.now ?? new Date()).getTime());
  if (params.interval !== STUDENT_PROMO_INTERVAL) throw new ApiError(400, PROMO_MESSAGES.monthlyOnly);
  await assertStudentEligible(params.userId);
  return { kind: "student", code, promotionCodeId: promo.id };
}

/** For showing a saved code on the upgrade page: what the code would do, never throwing. */
export async function previewPromoCode(
  userId: string,
  code: string
): Promise<{ ok: true; kind: PromoResolution["kind"]; code: string } | { ok: false }> {
  try {
    const resolution = await evaluatePromoCode({ userId, code, interval: STUDENT_PROMO_INTERVAL });
    return { ok: true, kind: resolution.kind, code: resolution.code };
  } catch {
    return { ok: false };
  }
}

/**
 * Reserves the one student redemption this person gets, before they are sent to
 * Checkout. Reuses their pending reservation if an earlier Checkout was
 * abandoned, and refuses if they have already redeemed. Returns the previous
 * Checkout Session (if any) so the caller can close it once the new one exists:
 * two open sessions for one person could otherwise both complete.
 */
export async function claimStudentPromo(params: {
  userId: string;
  code: string;
  promotionCodeId: string;
}): Promise<{ id: string; previousSessionId: string | null }> {
  const admin = createAdminClient();
  // The earlier checkout session is deliberately not cleared here: it stays on the
  // row until the new session replaces it (attachSessionToClaim), so if creating
  // the new one fails, the next attempt still knows which old one to close.
  const fields = {
    code: params.code,
    stripe_promotion_code_id: params.promotionCodeId,
  };

  // Two passes: the second is for the rare case that a parallel request inserted
  // the row between our read and our insert (the unique user_id says so).
  for (let pass = 0; pass < 2; pass++) {
    const existing = await admin
      .from("promo_redemptions")
      .select("id, status, stripe_checkout_session_id")
      .eq("user_id", params.userId)
      .maybeSingle();
    if (existing.error) throw new Error(`[promo] could not read the reservation: ${existing.error.message}`);

    if (existing.data) {
      if (existing.data.status === "redeemed") throw new ApiError(409, PROMO_MESSAGES.alreadyUsed);
      const { error } = await admin
        .from("promo_redemptions")
        .update(fields)
        .eq("id", existing.data.id)
        .eq("status", "pending");
      if (error) throw new Error(`[promo] could not update the reservation: ${error.message}`);
      return { id: existing.data.id as string, previousSessionId: (existing.data.stripe_checkout_session_id as string | null) ?? null };
    }

    const inserted = await admin
      .from("promo_redemptions")
      .insert({ user_id: params.userId, ...fields })
      .select("id")
      .single();
    if (!inserted.error) return { id: inserted.data.id as string, previousSessionId: null };
    if (inserted.error.code !== "23505") throw new Error(`[promo] could not reserve the code: ${inserted.error.message}`);
  }
  throw new Error("[promo] could not reserve the code");
}

export async function attachSessionToClaim(claimId: string, sessionId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("promo_redemptions")
    .update({ stripe_checkout_session_id: sessionId })
    .eq("id", claimId);
  if (error) console.error("[promo] could not record the checkout session:", error.message);
}

/** Closes an earlier, unfinished Checkout Session. A failure (already closed, already paid) does not matter. */
export async function expireCheckoutSession(sessionId: string | null): Promise<void> {
  if (!sessionId) return;
  try {
    await getStripeClient().checkout.sessions.expire(sessionId);
  } catch {
    /* already completed or expired */
  }
}

/**
 * Stripe says Checkout completed for a reserved code: record the redemption, once.
 * Returns true only the first time (so the caller records the analytics event once).
 */
export async function markPromoRedeemed(params: {
  claimId: string;
  userId: string;
  subscriptionId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promo_redemptions")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      stripe_subscription_id: params.subscriptionId,
    })
    .eq("id", params.claimId)
    .eq("user_id", params.userId)
    .eq("status", "pending")
    .select("id");
  if (error) throw new Error(`[promo] could not record the redemption: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Student promo codes: one free month of Premium, for verified students.
 *
 * Every student code is a Stripe promotion code that points at ONE coupon (100%
 * off, applied once, so the first monthly invoice is free). Stripe holds each
 * code's redemption limit and expiry; Stripe cannot tell whether the person
 * holding a code is a verified student, so the server checks that before it
 * applies the code (see lib/stripe/promo.ts), and the Checkout page never shows
 * Stripe's own promotion-code box.
 */

/** The coupon every student promotion code points at. Created by `npm run promo-codes`. */
export const STUDENT_COUPON_ID = "zolo-student-free-month";

/**
 * Whether a student must put a card down to start the free month.
 *
 * Set STUDENT_PROMO_REQUIRE_CARD=false (in Vercel, then redeploy) to start the
 * free month with no card. Anything else, including unset, requires one.
 *
 * Card required (the default): the student enters a card, is charged nothing now,
 * and is charged the regular Premium price when the month ends unless they cancel
 * first. More of them become paying customers with no further step, and an
 * account made only to collect a free month has to supply a card. Fewer start,
 * because asking for a card at the door puts some people off, and some will be
 * surprised by the first charge, which draws complaints and chargebacks. The
 * checkout and the terms say plainly what happens at the end of the month.
 *
 * No card: more students start, with the least friction. But when the month ends
 * there is no card to charge, so the subscription lapses and Premium turns off
 * unless the student adds a card from their profile. Expect far fewer to convert
 * to paying, and a free month is easier to collect and walk away from.
 */
export function studentPromoRequiresCard(): boolean {
  return process.env.STUDENT_PROMO_REQUIRE_CARD?.trim().toLowerCase() !== "false";
}

/** The free month is for the monthly price only: the coupon would otherwise take a whole year off. */
export const STUDENT_PROMO_INTERVAL = "monthly" as const;

/** Letters, digits and hyphens are all Stripe allows in a promotion code. */
export const STRIPE_PROMO_CODE = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;

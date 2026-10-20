import { brand } from "./brand";

/**
 * Pricing is centralized here and never hard-coded elsewhere. The Stripe
 * price ID is what actually drives checkout; the numbers below are for
 * display only and should be kept in sync with the Stripe Dashboard.
 */
export const pricing = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceId: null,
    description: "Get a taste of personalized discovery.",
    features: [
      "Basic personalized discovery",
      "Your top 5 personalized picks in Discover",
      "Unlimited saves",
      "Basic map",
      "1 Surprise Me / week",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceMonthly: Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE ?? 19.99),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ?? "",
    // Annual billing: $190/year vs. $19.99 x 12 = $239.88/month-to-month —
    // a real ~20.8% discount, not just display copy. annualPriceId is a
    // separate real Stripe Price on the same product (not computed from
    // priceMonthly), so what's charged always matches what Stripe has on
    // file, never a client-side calculation that could drift.
    priceAnnual: Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_ANNUAL ?? 190),
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_ANNUAL_PRICE_ID ?? "",
    description: `Unlock the full ${brand.name} experience.`,
    features: [
      "Unlimited personalized discovery",
      "Advanced AI recommendations",
      "More specific categories in Discover",
      "Unlimited Surprise Me",
      "AI Weekend Planner",
      "AI Trip Planner",
      "Advanced personalization & filters",
      // "Premium & exclusive experiences" and "Priority access where
      // supported" removed -- see the matching comment in
      // (marketing)/pricing/page.tsx's COMPARISON_ROWS for why (legal risk
      // review finding 6: neither ships today).
      "Travel Mode for 10 destinations",
    ],
  },
} as const;

export type PlanId = keyof typeof pricing;
export type BillingInterval = "monthly" | "annual";

/**
 * The Student plan: everything in Premium, monthly only, at a lower price, for accounts
 * with a verified school email (profiles.edu_verified_at, set by the database when a
 * school address is confirmed). It is a second real Stripe Price on the SAME product as
 * Premium, so the student free-month coupon (which is limited to that product) works on
 * it and entitlements are identical: a student subscription is plan_id "premium" in our
 * database, told apart only by its price id (see isStudentPriceId).
 *
 * The plan is offered only once its Stripe Price exists and its id is set
 * (NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID): until then the pricing page, the upgrade page,
 * the FAQ and the Terms say nothing about it, because a price we cannot charge must not
 * be advertised. Create the Price with `npm run student-price`. The number below is for
 * display and must match the Price in Stripe. Kept apart from `pricing` so it is never
 * mistaken for a plan_id.
 */
export const studentPricing = {
  id: "student",
  name: "Student",
  priceMonthly: Number(process.env.NEXT_PUBLIC_STUDENT_PRICE ?? 9.99),
  priceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID ?? "",
} as const;

export type CheckoutPlan = "premium" | "student";

export function isStudentPlanConfigured(): boolean {
  return studentPricing.priceId !== "";
}

export function studentPriceId(): string {
  return studentPricing.priceId;
}

/** Whether a Stripe price id is the Student price (false for anything else, and always false until it is configured). */
export function isStudentPriceId(priceId: string | null | undefined): boolean {
  return Boolean(priceId) && priceId === studentPricing.priceId;
}

export function premiumPriceId(interval: BillingInterval): string {
  return interval === "annual" ? pricing.premium.annualPriceId : pricing.premium.priceId;
}

export const FREE_TIER_LIMITS = {
  recommendationsPerWeek: 5,
  surpriseMePerWeek: 1,
  // "Not for me" on a Surprise Me pick fetches another one, which costs a Claude
  // call and a Places lookup like the first. Free accounts get this many
  // replacements a week on top of their weekly pick; Premium is bounded only
  // by the daily limits in lib/config/usage.ts. (A starting value: change it
  // here.)
  surpriseMeRerollsPerWeek: 2,
  weekendPlannerEnabled: false,
  travelModeEnabled: false,
} as const;

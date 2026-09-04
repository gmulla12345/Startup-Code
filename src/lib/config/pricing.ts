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
      "Unlimited Surprise Me",
      "AI Weekend Planner",
      "AI Trip Planner",
      "Advanced personalization & filters",
      "Premium & exclusive experiences",
      "Travel Mode for 10+ destinations",
      "Priority access where supported",
    ],
  },
} as const;

export type PlanId = keyof typeof pricing;
export type BillingInterval = "monthly" | "annual";

export function premiumPriceId(interval: BillingInterval): string {
  return interval === "annual" ? pricing.premium.annualPriceId : pricing.premium.priceId;
}

export const FREE_TIER_LIMITS = {
  recommendationsPerWeek: 5,
  surpriseMePerWeek: 1,
  weekendPlannerEnabled: false,
  travelModeEnabled: false,
} as const;

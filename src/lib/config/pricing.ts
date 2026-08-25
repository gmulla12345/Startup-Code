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
    description: "Unlock the full REAL experience.",
    features: [
      "Unlimited personalized discovery",
      "Advanced AI recommendations",
      "Unlimited Surprise Me",
      "AI Weekend Planner",
      "AI Trip Planner",
      "Advanced personalization & filters",
      "Premium & exclusive experiences",
      "Travel Mode for any destination",
      "Priority access where supported",
    ],
  },
} as const;

export type PlanId = keyof typeof pricing;

export const FREE_TIER_LIMITS = {
  recommendationsPerWeek: 5,
  surpriseMePerWeek: 1,
  weekendPlannerEnabled: false,
  travelModeEnabled: false,
} as const;

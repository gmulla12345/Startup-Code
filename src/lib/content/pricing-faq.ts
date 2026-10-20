import { isStudentPlanConfigured, pricing, studentPricing } from "@/lib/config/pricing";
import type { FaqItem } from "@/components/marketing/faq-accordion";

/**
 * Shared with the "Pricing & Premium" section of /faq and the standalone
 * /pricing page, so the answers (especially the cancellation policy) never
 * drift between the two.
 */
export const PRICING_FAQ_ITEMS: FaqItem[] = [
  {
    q: "What's included in the free plan?",
    a: "Free gets you personalized discovery with your top 5 picks in Discover each week, unlimited saves, the basic map, and one Surprise Me pick per week.",
  },
  {
    q: "What do I get with Premium?",
    a: `Premium ($${pricing.premium.priceMonthly}/month, or $${pricing.premium.priceAnnual}/year) unlocks unlimited personalized discovery and Surprise Me, more specific categories in Discover (e.g. "Italian Restaurant" instead of "Food & Drink"), the AI Weekend Planner and Trip Planner, advanced filters, and Travel Mode for 10 destinations.`,
  },
  // Only once the Student plan can actually be bought (see studentPricing in config/pricing.ts).
  ...(isStudentPlanConfigured()
    ? [
        {
          // COPY: the student price, in the pricing questions
          q: "Is there a student price?",
          a: `Yes. Students with a verified school email can have everything in Premium for $${studentPricing.priceMonthly} a month, monthly only. We check your school email once, when you start, and your rate stays the same for as long as you stay subscribed. Make an account with your school email on the students page, then choose Student in your profile. A student promo code works with it: the free month comes first, then the student price. The student price may be offered to a limited number of students; if its spots are taken it is no longer offered to new subscribers, and anyone already on it keeps their rate.`,
        },
      ]
    : []),
  {
    q: "Can I cancel Premium anytime?",
    a: "Yes — manage or cancel your subscription anytime from your Profile. You'll keep Premium access through the end of your current billing period.",
  },
  {
    q: "Do you offer refunds?",
    a: "Fees are non-refundable except where required by law. See our Terms of Service for the full billing policy.",
  },
];

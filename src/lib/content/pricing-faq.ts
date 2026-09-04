import { pricing } from "@/lib/config/pricing";
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
    a: `Premium ($${pricing.premium.priceMonthly}/month, or $${pricing.premium.priceAnnual}/year) unlocks unlimited personalized discovery and Surprise Me, the AI Weekend Planner and Trip Planner, advanced filters, premium and exclusive experiences, and Travel Mode for 10+ destinations.`,
  },
  {
    q: "Can I cancel Premium anytime?",
    a: "Yes — manage or cancel your subscription anytime from your Profile. You'll keep Premium access through the end of your current billing period.",
  },
  {
    q: "Do you offer refunds?",
    a: "Fees are non-refundable except where required by law. See our Terms of Service for the full billing policy.",
  },
];

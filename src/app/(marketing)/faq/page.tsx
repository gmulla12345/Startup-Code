import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqAccordion, type FaqSection } from "@/components/marketing/faq-accordion";
import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  const sections: FaqSection[] = [
    {
      title: "Getting started",
      items: [
        {
          q: `What is ${brand.name}?`,
          a: `${brand.name} is a personalized discovery platform. Tell it your interests, budget, and location, and it recommends real-world experiences, activities, and hidden gems worth actually doing — each with a reason, not just a list.`,
        },
        {
          q: "Is it available where I live?",
          a: "Yes. Discovery works anywhere in the world — we blend a curated catalog with live places data, so you're not limited to a handful of launch cities.",
        },
        {
          q: "How do I get started?",
          a: "Create a free account, complete a short onboarding about your interests and budget, and your first personalized picks are ready immediately in Discover.",
        },
      ],
    },
    {
      title: "How recommendations work",
      items: [
        {
          q: `How does ${brand.name} pick recommendations for me?`,
          a: "We combine structured filtering (your location, budget, and preferences), a deterministic scoring model, and AI reasoning to explain why each pick fits you — not just a raw popularity list.",
        },
        {
          q: "What's a \"hidden gem\"?",
          a: "A lesser-known spot our system surfaces using real signals — like a strong rating with lower review volume — rather than just showing the most popular, already-crowded options.",
        },
        {
          q: "What happens if I don't like a recommendation?",
          a: `Dismiss it or tap "Not for me" on a Surprise Me pick — ${brand.name} learns from that feedback immediately and adjusts what it shows you next.`,
        },
        {
          q: `Is booking handled through ${brand.name}?`,
          a: "For experiences with a booking partner, we link you directly to their site. We never fabricate availability or pricing — if we don't have live data for something, we say so.",
        },
      ],
    },
    {
      title: "Trips & travel",
      items: [
        {
          q: "What's the AI Weekend Planner?",
          a: "A Premium feature that builds a personalized itinerary for your weekend from your saved interests, location, and budget — so you get a plan instead of a list.",
        },
        {
          q: "How does Travel Mode work?",
          a: "Search any destination and Travel Mode gives you a personalized set of recommendations and an itinerary for that trip, the same way Discover does for your home base.",
        },
      ],
    },
    {
      title: "Pricing & Premium",
      items: [
        {
          q: "What's included in the free plan?",
          a: "Free gets you personalized discovery with your top 5 picks in Discover each week, unlimited saves, the basic map, and one Surprise Me pick per week.",
        },
        {
          q: "What do I get with Premium?",
          a: `Premium ($${pricing.premium.priceMonthly}/month) unlocks unlimited personalized discovery and Surprise Me, the AI Weekend Planner and Trip Planner, advanced filters, premium and exclusive experiences, and Travel Mode for any destination.`,
        },
        {
          q: "Can I cancel anytime?",
          a: "Yes — manage or cancel your subscription anytime from your Profile. You'll keep Premium access through the end of your current billing period.",
        },
        {
          q: "Do you offer refunds?",
          a: "Fees are non-refundable except where required by law. See our Terms of Service for the full billing policy.",
        },
      ],
    },
    {
      title: "Privacy & trust",
      items: [
        {
          q: "What data do you collect and how is it used?",
          a: "We collect what's needed to personalize your recommendations — your preferences, location, and activity in the app. We don't sell your personal data. Full details are in our Privacy Policy.",
        },
        {
          q: "Can I delete my account and data?",
          a: `You can edit or remove profile information anytime from Profile settings. To fully delete your account and data, email us at ${brand.supportEmail} — it's removed or anonymized within 30 days.`,
        },
        {
          q: `Does ${brand.name} ever make up places or information?`,
          a: "No. Every recommendation is grounded in real data. If we don't know something for certain — like live pricing or availability — we say so instead of guessing.",
        },
      ],
    },
    {
      title: "Account & support",
      items: [
        {
          q: "I didn't get a confirmation email — what do I do?",
          a: "Check your spam folder first. Confirmation links only work from the same browser/device you signed up on. Still stuck? Email us and we'll sort it out.",
        },
        {
          q: "How do I contact support?",
          a: `Email us anytime at ${brand.supportEmail} — we read every message.`,
        },
      ],
    },
  ];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--forest-soft),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-14 text-center">
          <p className="text-sm font-medium text-ember mb-4">Support</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground leading-tight">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-lg text-foreground-muted">
            Everything you need to know about {brand.name}. Can&apos;t find it here?{" "}
            <a href={`mailto:${brand.supportEmail}`} className="text-ember hover:underline">
              Email us
            </a>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-20">
        <FaqAccordion sections={sections} />

        <div className="mt-16 text-center">
          <Button asChild size="lg">
            <Link href="/signup">
              Start Discovering <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

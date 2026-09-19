import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqAccordion, type FaqSection } from "@/components/marketing/faq-accordion";
import { brand } from "@/lib/config/brand";
import { PRICING_FAQ_ITEMS } from "@/lib/content/pricing-faq";
import { canonical, safeJsonLd } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";

const DESCRIPTION = "Answers to common questions about Zolo's personalized discovery, pricing, privacy, and travel features.";

export const metadata: Metadata = {
  title: "FAQ",
  description: DESCRIPTION,
  openGraph: { title: `FAQ · ${brand.name}`, description: DESCRIPTION },
  ...canonical("/faq"),
};

export default function FaqPage() {
  const sections: FaqSection[] = [
    {
      title: "Getting started",
      items: [
        {
          q: `What is Discover Zolo?`,
          a: `Discover Zolo (the app is simply called "${brand.name}") is a personalized discovery platform. Tell it your interests, budget, and location, and it recommends real-world experiences, activities, and hidden gems worth actually doing — each with a reason, not just a list.`,
        },
        {
          q: "Is Discover Zolo the same company as Zolo.ca, ZoloStays, or other companies named \"Zolo\"?",
          a: "No. \"Zolo\" is used by several unrelated companies — including Zolo.ca (Canadian real estate), ZoloStays (co-living in India), and others. Discover Zolo, at discoverzolo.com, is an independent personalized discovery platform for things to do and travel — not affiliated with any of them.",
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
          a: "Pick one of our dedicated destination guides — 10 cities and counting across North America, Europe, and Australia — and Travel Mode gives you a personalized set of recommendations and an itinerary for that trip, the same way Discover does for your home base. We're adding new destinations regularly.",
        },
      ],
    },
    {
      title: "Pricing & Premium",
      items: PRICING_FAQ_ITEMS,
    },
    {
      title: "Privacy, trust & accuracy",
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
          q: "How accurate is Zolo's place information?",
          a: "Zolo pulls venue data from Google's Places database, including ratings, addresses, and descriptions. We show what we know and clearly mark what we don't. Hours, pricing, and availability can change at any time — we always recommend confirming with the venue before heading out.",
        },
        {
          q: "Does Zolo handle booking?",
          a: "No. Zolo is a discovery platform, not a booking platform. We help you find the right experience for you, then send you to the official source — the venue's website, Google Maps listing, or ticketing partner — to confirm details or make a reservation.",
        },
        {
          q: "Why should I confirm hours before going?",
          a: "Venues occasionally update their hours for holidays, renovations, or seasonal changes. Zolo's data is refreshed regularly but isn't real-time. A quick check on Google Maps or the venue's website before you leave takes 10 seconds and saves a wasted trip.",
        },
        {
          q: "Where does Zolo get its place data?",
          a: "Venue information — names, addresses, ratings, and descriptions — comes from Google's Places API. Our personalized recommendations are generated by Zolo's own AI reasoning engine, which combines your preferences, budget, and location to explain why each pick fits you.",
        },
        {
          q: "What should I do if information looks wrong?",
          a: `Use the "Report outdated info" link on any experience page to flag outdated hours, closed venues, wrong categories, or incorrect details. We review every report and update our data accordingly.`,
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }))
    ),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }} />
      <BreadcrumbJsonLd items={[{ name: "FAQ", path: "/faq" }]} />
      <section>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-14 text-center">
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

      <section className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 mb-12">
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">What is Discover Zolo?</h2>
          <p className="text-sm text-foreground-muted leading-relaxed">
            Discover Zolo is a personalized discovery platform — not a real estate marketplace, not a co-living
            brand, and not affiliated with any other company that happens to use &quot;Zolo&quot; in its name.
            We recommend real-world experiences, activities, and hidden gems based on your interests, budget, and
            personality, with a plain-language reason behind every pick.
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

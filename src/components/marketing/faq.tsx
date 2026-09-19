"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { brand } from "@/lib/config/brand";
import { safeJsonLd } from "@/lib/seo";

const FAQS = [
  {
    q: `Is Discover Zolo related to Zolo.ca or other companies named "Zolo"?`,
    a: `No. "Zolo" is used by several unrelated companies, including Zolo.ca (Canadian real estate) and ZoloStays (co-living in India). Discover Zolo, at discoverzolo.com, is an independent personalized discovery platform — not affiliated with any of them.`,
  },
  {
    q: `How does ${brand.name} pick recommendations for me?`,
    a: "We combine structured filtering (your location, budget, and preferences), a deterministic scoring model, and AI reasoning to explain why each pick fits you — not just a raw popularity list.",
  },
  {
    q: `Does ${brand.name} handle booking?`,
    a: `No. ${brand.name} is a discovery platform, not a booking platform. We help you find the right experience for you, then send you to the official source — the venue's website, Google Maps listing, or ticketing partner — to confirm details or make a reservation.`,
  },
  {
    q: `How accurate is ${brand.name}'s place information?`,
    a: "We pull venue data from Google's Places database, including ratings, addresses, and descriptions. We show what we know and clearly mark what we don't. Hours, pricing, and availability can change at any time — we always recommend confirming with the venue before heading out.",
  },
  {
    q: "What happens if I don't like a recommendation?",
    a: `Dismiss it or tap Not For Me on a Surprise Me pick — ${brand.name} learns from that feedback immediately and adjusts what it shows you next.`,
  },
  {
    q: "Can I cancel Premium anytime?",
    a: "Yes — manage or cancel your subscription anytime from your Profile. You'll keep Premium access through the end of your billing period.",
  },
  {
    q: `Which cities does ${brand.name} cover?`,
    a: "Discover and Surprise Me work anywhere — they run on live places data, not a fixed city list. Travel Mode has dedicated destination guides for 10 cities across North America, Europe, and Australia today, with more being added regularly.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_JSON_LD) }} />

      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-10 text-center">
        Frequently asked questions
      </h2>

      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="rounded-[var(--radius-md)] border border-border bg-surface overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="font-medium text-foreground">{item.q}</span>
                <ChevronDown className={cn("h-4 w-4 text-foreground-muted transition-transform shrink-0", isOpen && "rotate-180")} />
              </button>
              {/*
               * Always rendered (not conditionally mounted) so every answer
               * is present in the static HTML for search engines and AI
               * crawlers — only the CSS grid row height collapses to 0 for
               * the visual accordion effect. Google explicitly allows
               * accordion-hidden content for FAQPage rich results as long
               * as it's actually in the page HTML, which this guarantees.
               */}
              <div className={cn("grid transition-[grid-template-rows] duration-200", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-sm text-foreground-muted leading-relaxed">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-foreground-muted">
        <Link href="/faq" className="text-ember hover:underline">
          See the full FAQ
        </Link>
      </p>
    </section>
  );
}

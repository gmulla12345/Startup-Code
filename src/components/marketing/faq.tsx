"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { brand } from "@/lib/config/brand";

const FAQS = [
  {
    q: `How does ${brand.name} pick recommendations for me?`,
    a: "We combine structured filtering (your location, budget, and preferences), a deterministic scoring model, and AI reasoning to explain why each pick fits you — not just a raw popularity list.",
  },
  {
    q: `Is booking handled through ${brand.name}?`,
    a: "For experiences with a booking partner, we link you directly to their site. We never fabricate availability or pricing — if we don't have live data, we say so.",
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
    a: "We're launching with a curated catalog in a handful of cities and expanding quickly. Travel Mode works for any destination you search.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mb-10 text-center">
        Frequently asked questions
      </h2>

      <div className="space-y-3">
        {FAQS.map((item, i) => (
          <div key={item.q} className="rounded-[var(--radius-md)] border border-border bg-surface overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-medium text-foreground">{item.q}</span>
              <ChevronDown className={cn("h-4 w-4 text-foreground-muted transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <p className="px-5 pb-4 text-sm text-foreground-muted leading-relaxed">{item.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

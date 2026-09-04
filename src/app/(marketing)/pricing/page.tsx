import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { ComparisonCellValue, type ComparisonCell } from "@/components/marketing/comparison-cell";
import { brand } from "@/lib/config/brand";
import { PRICING_FAQ_ITEMS } from "@/lib/content/pricing-faq";

export const metadata: Metadata = {
  title: "Pricing — Free & Premium Plans",
  description: `See ${brand.name} pricing for personalized discovery, AI trip planning, and things to do near you. Free plan available. Premium from $19.99/month or $190/year — cancel anytime.`,
};

const COMPARISON_ROWS: { feature: string; free: ComparisonCell; premium: ComparisonCell }[] = [
  { feature: "Personalized discovery", free: "Top 5 picks / week", premium: "Unlimited" },
  { feature: "AI recommendations", free: "Basic", premium: "Advanced" },
  { feature: "Surprise Me", free: "1 / week", premium: "Unlimited" },
  { feature: "Saved experiences", free: true, premium: true },
  { feature: "Map", free: true, premium: true },
  { feature: "AI Weekend Planner", free: false, premium: true },
  { feature: "AI Trip Planner", free: false, premium: true },
  { feature: "Advanced personalization & filters", free: false, premium: true },
  { feature: "Premium & exclusive experiences", free: false, premium: true },
  { feature: "Travel Mode for 10+ destinations", free: false, premium: true },
  { feature: "Priority access where supported", free: false, premium: true },
];

const PRICING_FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: PRICING_FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function PricingPage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PRICING_FAQ_JSON_LD) }} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--forest-soft),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-14 text-center">
          <p className="text-sm font-medium text-ember mb-4">Pricing</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground leading-tight">
            Simple pricing that grows with you
          </h1>
          <p className="mt-4 text-lg text-foreground-muted">
            Start free. Upgrade to Premium whenever unlimited discovery, AI trip planning, and exclusive experiences
            are worth it to you.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <PricingCards />
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 md:py-20 border-t border-border">
        <h2 className="font-display text-3xl font-semibold text-foreground text-center mb-10">Compare plans</h2>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th className="text-left font-medium text-foreground-muted px-5 py-3">Feature</th>
                <th className="text-center font-medium text-foreground px-5 py-3">Free</th>
                <th className="text-center font-medium text-foreground px-5 py-3">Premium</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-5 py-3.5 text-foreground-muted">{row.feature}</td>
                  <td className="px-5 py-3.5 text-center">
                    <ComparisonCellValue value={row.free} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <ComparisonCellValue value={row.premium} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 md:py-20 border-t border-border">
        <h2 className="font-display text-3xl font-semibold text-foreground text-center mb-10">Pricing questions</h2>
        <div className="space-y-3">
          {PRICING_FAQ_ITEMS.map((item) => (
            <div key={item.q} className="rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4">
              <h3 className="font-medium text-foreground mb-1.5">{item.q}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-foreground-muted">
          <Link href="/faq" className="text-ember hover:underline">
            See the full FAQ
          </Link>
        </p>
      </section>

      <section className="text-center py-16 md:py-20 border-t border-border">
        <Button asChild size="lg">
          <Link href="/signup">
            Start Discovering <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

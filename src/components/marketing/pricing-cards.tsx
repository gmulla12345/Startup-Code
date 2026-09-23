"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/marketing/magnetic";
import { pricing, type BillingInterval } from "@/lib/config/pricing";
import { getBillingPreference, setBillingPreference } from "@/lib/utils/billing-preference";

/**
 * The billing toggle + free/premium card layout, shared between the
 * homepage's embedded #pricing section and the standalone /pricing page so
 * both always show identical copy, pricing, and toggle behavior.
 */
export function PricingCards() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after mount to avoid an SSR hydration mismatch
    setInterval(getBillingPreference());
  }, []);

  function choose(next: BillingInterval) {
    setInterval(next);
    setBillingPreference(next);
  }

  const isAnnual = interval === "annual";
  const premiumPrice = isAnnual ? pricing.premium.priceAnnual : pricing.premium.priceMonthly;
  // Real math against the site's own live prices (12 months at the monthly
  // rate vs. the actual annual Stripe price), not an invented reference
  // price -- see pricing.ts's own comment on why annualPriceId is a real,
  // separate Stripe Price rather than a client-side calculation.
  const monthlyPaidYearly = pricing.premium.priceMonthly * 12;
  const annualSavings = monthlyPaidYearly - pricing.premium.priceAnnual;
  // Floored, not rounded, to match the "Save 20%" figure already used
  // elsewhere on the site (pricing FAQ, the toggle badge below) -- the real
  // number is ~20.8%, and floor keeps every "Save X%" claim on the page
  // consistent with each other rather than one place saying 21%.
  const annualSavingsPercent = Math.floor((annualSavings / monthlyPaidYearly) * 100);

  return (
    <div>
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          <button
            onClick={() => choose("monthly")}
            className={cn(
              "px-4 py-3 rounded-full text-sm font-medium transition-colors",
              !isAnnual ? "bg-ember text-white" : "text-foreground-muted"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => choose("annual")}
            className={cn(
              "px-4 py-3 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1.5",
              isAnnual ? "bg-ember text-white" : "text-foreground-muted"
            )}
          >
            Annual
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                isAnnual ? "bg-white/20" : "bg-[var(--gold-soft)] text-[color:var(--gold)]"
              )}
            >
              Save 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto items-start">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-8">
          <h3 className="font-display text-xl font-semibold text-foreground">{pricing.free.name}</h3>
          <div className="mt-2 mb-6">
            <span className="font-display text-4xl font-semibold text-foreground">$0</span>
            <span className="text-foreground-muted"> /month</span>
          </div>
          <ul className="space-y-3 mb-8">
            {pricing.free.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground-muted">
                <Check className="h-4 w-4 text-foreground-muted mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/signup">Get started</Link>
          </Button>
          <p className="mt-3 text-center text-xs text-foreground-subtle">No credit card required</p>
        </div>

        <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25, ease: "easeOut" }}>
          <div className="rounded-[var(--radius-lg)] border-2 border-ember bg-surface p-8 relative shadow-[0_0_0_1px_rgba(255,106,69,0.08),var(--shadow-raised)]">
            {/* "Most popular" is an objective claim about subscriber choice --
                removed per legal risk review finding 5: with no subscribers
                yet, it's an unsubstantiated FTC Act §5 claim. Revisit once
                real usage data actually supports it. */}
            <h3 className="font-display text-xl font-semibold text-foreground">{pricing.premium.name}</h3>
            <div className="mt-2 mb-1 flex items-baseline gap-2 flex-wrap">
              {isAnnual && (
                <span className="text-lg text-foreground-subtle line-through decoration-2">
                  ${monthlyPaidYearly.toFixed(2)}
                </span>
              )}
              <span className="font-display text-4xl font-semibold text-foreground">${premiumPrice}</span>
              <span className="text-foreground-muted">/{isAnnual ? "year" : "month"}</span>
              {isAnnual && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--gold-soft)] text-[color:var(--gold)]">
                  Save {annualSavingsPercent}%
                </span>
              )}
            </div>
            <p className="text-sm text-[color:var(--gold)] font-medium mb-5 min-h-5">
              {isAnnual
                ? `That's $${(premiumPrice / 12).toFixed(2)}/mo — $${annualSavings.toFixed(2)} less per year than paying monthly.`
                : "Switch to annual and save 20% — try it above."}
            </p>
            <ul className="space-y-3 mb-8">
              {pricing.premium.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground-muted">
                  <Check className="h-4 w-4 text-ember mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Magnetic>
              <Button asChild size="lg" className="w-full">
                <Link href="/signup">Start Premium</Link>
              </Button>
            </Magnetic>
            <p className="mt-3 text-center text-xs text-foreground-subtle">
              7-day free trial — cancel before it ends and you won&apos;t be charged
            </p>
          </div>
        </motion.div>
      </div>

      <div className="mt-10 max-w-2xl mx-auto rounded-[var(--radius-lg)] border border-border bg-surface p-6">
        <p className="font-medium text-foreground text-sm mb-3">Why pay for Zolo when so much is free?</p>
        <ul className="space-y-2 text-sm text-foreground-muted">
          <li>
            <Link href="/vs/zolo-vs-google-maps" className="hover:text-foreground">
              <span className="font-medium text-foreground">vs Google Maps:</span> personalized picks with reasoning,
              not 10,000 unranked results.
            </Link>
          </li>
          <li>
            <Link href="/vs/zolo-vs-tripadvisor" className="hover:text-foreground">
              <span className="font-medium text-foreground">vs Tripadvisor:</span> a short curated list, not hours of
              review scrolling.
            </Link>
          </li>
          <li>
            <Link href="/vs/zolo-vs-atlas-obscura" className="hover:text-foreground">
              <span className="font-medium text-foreground">vs Atlas Obscura:</span> matched to your interests and
              budget, not editorial picks.
            </Link>
          </li>
        </ul>
        <p className="mt-3 text-sm text-foreground-muted">
          Less than one guided tour per month — and you&apos;ll never waste a weekend scrolling again.
        </p>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-foreground-subtle">
        <Lock className="h-3.5 w-3.5" /> Payments secured by Stripe
      </p>
    </div>
  );
}

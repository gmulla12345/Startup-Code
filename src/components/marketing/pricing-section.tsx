"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { pricing, type BillingInterval } from "@/lib/config/pricing";
import { getBillingPreference, setBillingPreference } from "@/lib/utils/billing-preference";

export function PricingSection() {
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
  const annualSavings = pricing.premium.priceMonthly * 12 - pricing.premium.priceAnnual;

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <div className="max-w-2xl mb-10 mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">Simple pricing</h2>
        <p className="mt-4 text-foreground-muted text-lg">Start free. Upgrade when you want more.</p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          <button
            onClick={() => choose("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              !isAnnual ? "bg-ember text-white" : "text-foreground-muted"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => choose("annual")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1.5",
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
                <Check className="h-4 w-4 text-forest mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>

        <div>
          <div className="rounded-[var(--radius-lg)] border-2 border-ember bg-surface p-8 relative">
            <span className="absolute -top-3 left-8 bg-ember text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most popular
            </span>
            <h3 className="font-display text-xl font-semibold text-foreground">{pricing.premium.name}</h3>
            <div className="mt-2 mb-1">
              <span className="font-display text-4xl font-semibold text-foreground">${premiumPrice}</span>
              <span className="text-foreground-muted"> /{isAnnual ? "year" : "month"}</span>
            </div>
            <p className="text-sm text-forest font-medium mb-5 h-5">
              {isAnnual ? `That's $${(premiumPrice / 12).toFixed(2)}/mo — you save $${annualSavings.toFixed(2)}/year.` : ""}
            </p>
            <ul className="space-y-3 mb-8">
              {pricing.premium.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground-muted">
                  <Check className="h-4 w-4 text-ember mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="w-full">
              <Link href="/signup">Start Premium</Link>
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-foreground-muted px-2">
            Less than one guided tour per month — and you&apos;ll never waste a weekend scrolling again.
          </p>
        </div>
      </div>
    </section>
  );
}

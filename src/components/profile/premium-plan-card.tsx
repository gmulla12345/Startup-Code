"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { pricing, type BillingInterval } from "@/lib/config/pricing";
import { getBillingPreference, setBillingPreference } from "@/lib/utils/billing-preference";
import { UpgradeButton } from "./upgrade-button";

export function PremiumPlanCard() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  // Reads the choice made on the homepage pricing toggle, if any — avoids a
  // hydration mismatch from reading localStorage during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after mount to avoid an SSR hydration mismatch
    setInterval(getBillingPreference());
  }, []);

  function choose(next: BillingInterval) {
    setInterval(next);
    setBillingPreference(next);
  }

  const isAnnual = interval === "annual";
  const price = isAnnual ? pricing.premium.priceAnnual : pricing.premium.priceMonthly;
  const annualSavings = pricing.premium.priceMonthly * 12 - pricing.premium.priceAnnual;

  return (
    <div>
      <div className="inline-flex rounded-full border border-border p-1 mb-6">
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

      <div className="mb-1">
        <span className="font-display text-4xl font-semibold text-foreground">${price}</span>
        <span className="text-foreground-muted"> /{isAnnual ? "year" : "month"}</span>
      </div>
      <p className="text-sm text-forest font-medium mb-6 h-5">
        {isAnnual ? `That's $${(price / 12).toFixed(2)}/mo — you save $${annualSavings.toFixed(2)}/year.` : ""}
      </p>

      <ul className="space-y-3 mb-8">
        {pricing.premium.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground-muted">
            <Check className="h-4 w-4 text-ember mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <UpgradeButton billingInterval={interval} />
      <p className="text-xs text-foreground-subtle text-center mt-3">Cancel anytime from your profile.</p>
    </div>
  );
}

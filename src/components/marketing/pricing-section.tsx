import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricing } from "@/lib/config/pricing";

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <div className="max-w-2xl mb-14 mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">Simple pricing</h2>
        <p className="mt-4 text-foreground-muted text-lg">Start free. Upgrade when you want more.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
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

        <div className="rounded-[var(--radius-lg)] border-2 border-ember bg-surface p-8 relative">
          <span className="absolute -top-3 left-8 bg-ember text-white text-xs font-semibold px-3 py-1 rounded-full">
            Most popular
          </span>
          <h3 className="font-display text-xl font-semibold text-foreground">{pricing.premium.name}</h3>
          <div className="mt-2 mb-6">
            <span className="font-display text-4xl font-semibold text-foreground">${pricing.premium.priceMonthly}</span>
            <span className="text-foreground-muted"> /month</span>
          </div>
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
      </div>
    </section>
  );
}

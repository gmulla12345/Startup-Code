import { PricingCards } from "./pricing-cards";

export function PricingSection() {
  return (
    <section id="pricing" className="bg-surface-sunken">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
        <div className="max-w-2xl mb-10 mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">Simple pricing</h2>
          <p className="mt-4 text-foreground-muted text-lg">Start free. Upgrade when you want more.</p>
        </div>

        <PricingCards />
      </div>
    </section>
  );
}

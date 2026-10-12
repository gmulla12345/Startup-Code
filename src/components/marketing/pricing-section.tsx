import { PricingCards } from "./pricing-cards";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";

export function PricingSection() {
  return (
    <section id="pricing" className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple pricing"
            subtitle="Start free. Upgrade when you want more."
            align="center"
            className="mb-10 mx-auto"
          />
        </Reveal>

        <Reveal delay={0.1}>
          <PricingCards />
        </Reveal>
      </div>
    </section>
  );
}

import { PricingCards } from "./pricing-cards";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SectionGlow } from "@/components/marketing/section-glow";
import { Reveal } from "@/components/marketing/reveal";

export function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-surface-sunken">
      <SectionGlow tone="gold" side="top-left" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
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

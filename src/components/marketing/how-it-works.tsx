import { User, Sparkles, ListChecks, ArrowRight } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";

const STEPS = [
  {
    number: "01",
    title: "Tell us who you are",
    description: "A quick, visual onboarding — interests, personality, budget, and what you're hoping to get more of.",
  },
  {
    number: "02",
    title: "Get matched instantly",
    description: "Our hybrid engine — structured filtering, scoring, and AI reasoning — builds your first recommendations.",
  },
  {
    number: "03",
    title: "Discover, save, or go",
    description: "Browse a short, curated list. Save what you love, or tap Surprise Me for something unexpected.",
  },
  {
    number: "04",
    title: "It keeps getting better",
    description: `Every save, skip, and trip teaches ${brand.name} more about you — so next week's picks are even sharper.`,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-surface-sunken">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Process"
            title={`How ${brand.name} works`}
            subtitle="From sign-up to your next adventure, in minutes."
            className="mb-14"
          />
        </Reveal>

        {/* A connecting line running behind all 4 steps on desktop, like a
            single thread the numbers sit on -- makes the 4 cards read as one
            sequence instead of 4 unrelated tiles, without needing anything
            heavier than a border. */}
        <div className="relative grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          <div className="hidden lg:block absolute top-5 left-[12.5%] right-[12.5%] h-px bg-border" aria-hidden />
          {STEPS.map((step, i) => (
            <Reveal key={step.number} delay={i * 0.1} className="relative">
              <span className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken border border-border-strong font-display text-sm font-semibold text-ember mb-4">
                {step.number}
              </span>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">{step.description}</p>
            </Reveal>
          ))}
        </div>

        {/*
         * The 4 steps above describe the user's journey. This diagram
         * answers a narrower, more concrete question the steps only
         * gesture at: what does the "hybrid engine" in step 2 actually do
         * with your profile to produce a pick? Shows one real example
         * (matching the reasoning shown in the hero mockup) flowing through
         * all three stages.
         */}
        <Reveal delay={0.3}>
          <div className="mt-16 rounded-[var(--radius-xl)] border border-border bg-surface p-6 sm:p-10">
            <h3 className="font-display text-xl font-semibold text-foreground mb-8 text-center">
              How a recommendation actually gets made
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-3">
              <div className="text-center sm:flex-1">
                <div className="h-12 w-12 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-3">
                  <User className="h-5 w-5 text-foreground-muted" />
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">Your profile</p>
                <p className="text-xs text-foreground-muted">Interests, budget, personality</p>
              </div>

              <ArrowRight className="h-4 w-4 text-foreground-subtle shrink-0 rotate-90 sm:rotate-0" />

              <div className="text-center sm:flex-1">
                <div className="h-12 w-12 rounded-full bg-[var(--ember-soft)] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-5 w-5 text-ember" />
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">Hybrid engine</p>
                <p className="text-xs text-foreground-muted">Structured filtering + scoring + AI reasoning</p>
              </div>

              <ArrowRight className="h-4 w-4 text-foreground-subtle shrink-0 rotate-90 sm:rotate-0" />

              <div className="text-center sm:flex-1">
                <div className="h-12 w-12 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-3">
                  <ListChecks className="h-5 w-5 text-foreground-muted" />
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">A short list, with reasoning</p>
                <p className="text-xs text-foreground-muted">Not just a rating — an actual reason</p>
              </div>
            </div>

            <div className="mt-8 max-w-sm mx-auto rounded-[var(--radius-lg)] border border-border bg-surface-sunken p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-medium text-sm text-foreground">Times Square</p>
                <span className="shrink-0 text-xs font-semibold text-ember bg-[var(--ember-soft)] rounded-full px-2 py-0.5">
                  96% match
                </span>
              </div>
              <p className="text-xs text-foreground-muted">Because you love outdoor adventure and have a $50 budget</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

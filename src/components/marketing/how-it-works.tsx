import { brand } from "@/lib/config/brand";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Tilt } from "@/components/marketing/tilt";
import type { Experience } from "@/types/database";

const STEPS = [
  {
    number: "01",
    title: "Tell us who you are",
    description: "A quick, visual onboarding — interests, personality, budget, and what you're hoping to get more of.",
  },
  {
    number: "02",
    title: "Get matched instantly",
    description: "We match you to real places nearby based on your answers, then use AI to sharpen the picks and explain each one.",
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

// A genuinely two-column, asymmetric section (copy left, real product
// mockup right) -- not another centered heading-over-a-grid, which is what
// every section on this page used to be. Also replaces the old abstract
// 3-icon "how a recommendation gets made" diagram, which had gone stale:
// its static example ("Times Square... because you love outdoor
// adventure") was never true of Times Square and had drifted further out
// of sync after Times Square's own real category was later corrected
// elsewhere in the app (see the 2026-09-11 categorization fix in this
// file's history). A live-rendered preview of the real Discover UI, built
// from real experience data, can't go stale the same way a hand-written
// example can.
export function HowItWorks({ experiences }: { experiences: Experience[] }) {
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

        <div className="grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.number} delay={i * 0.08} className="flex gap-4">
                <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface border border-border-strong font-display text-sm font-semibold text-ember">
                  {step.number}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-foreground-muted leading-relaxed">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15} className="lg:pl-4">
            <Tilt>
              <ProductPreview experiences={experiences} />
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

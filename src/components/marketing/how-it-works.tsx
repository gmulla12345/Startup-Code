import { brand } from "@/lib/config/brand";

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
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <div className="max-w-2xl mb-14">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">How {brand.name} works</h2>
        <p className="mt-4 text-foreground-muted text-lg">From sign-up to your next adventure, in minutes.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {STEPS.map((step) => (
          <div key={step.number}>
            <span className="font-display text-4xl font-semibold text-ember/30">{step.number}</span>
            <h3 className="font-display text-lg font-semibold text-foreground mt-3 mb-2">{step.title}</h3>
            <p className="text-sm text-foreground-muted leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Star } from "lucide-react";

/**
 * Placeholder social proof architecture. TESTIMONIALS below are sample
 * content for demo purposes — replace with real quotes once you have users.
 * The shape (name, role, quote, rating) is what actual testimonials should
 * match.
 */
interface Testimonial {
  name: string;
  role: string;
  quote: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Maya R.",
    role: "Product designer",
    quote: "I stopped doom-scrolling for plans and just started tapping Surprise Me. Found a rooftop yoga class I never would've searched for.",
    rating: 5,
  },
  {
    name: "Jordan K.",
    role: "Software engineer",
    quote: "The weekend planner actually gets my budget and energy level right. It's the first recommendation app that doesn't feel generic.",
    rating: 5,
  },
  {
    name: "Priya S.",
    role: "Marketing manager",
    quote: "Used Travel Mode for a trip to Tokyo and it nailed the hidden gems over the obvious tourist stuff.",
    rating: 5,
  },
];

const STATS = [
  { value: "20+", label: "curated categories" },
  { value: "Hybrid AI", label: "scoring + reasoning engine" },
  { value: "Worldwide", label: "discovery, anywhere you are" },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28 border-t border-border">
      <div className="grid sm:grid-cols-3 gap-8 mb-16 text-center sm:text-left">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="font-display text-3xl font-semibold text-foreground">{s.value}</div>
            <div className="text-sm text-foreground-muted mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-[var(--gold)] text-[var(--gold)]" />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
            <div className="text-sm font-medium text-foreground">{t.name}</div>
            <div className="text-xs text-foreground-muted">{t.role}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { LayoutGrid, Brain, Globe } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

// Plain facts about the product, not traction claims -- there's no user count
// or testimonial here on purpose (see CLAUDE.md: those wait for real data).
const STATS = [
  { icon: LayoutGrid, value: "20+", label: "Curated categories" },
  { icon: Brain, value: "Hybrid AI", label: "Scoring + reasoning engine" },
  { icon: Globe, value: "Worldwide", label: "Discovery, anywhere you are" },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-8 md:pb-12">
      <div className="grid divide-y divide-border rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="flex items-center gap-4 p-6 sm:p-7">
            <span
              aria-hidden
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ember-soft)] text-ember"
            >
              <s.icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <div className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{s.value}</div>
              <div className="text-sm text-foreground-muted">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

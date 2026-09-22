import { LayoutGrid, Brain, Globe } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const STATS = [
  { icon: LayoutGrid, value: "20+", label: "Curated categories" },
  { icon: Brain, value: "Hybrid AI", label: "Scoring + reasoning engine" },
  { icon: Globe, value: "Worldwide", label: "Discovery, anywhere you are" },
];

export function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 md:py-20 border-t border-border">
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="py-6 sm:py-0 sm:px-8 first:pl-0 first:pt-0">
            <s.icon className="h-5 w-5 text-ember mb-3" strokeWidth={1.75} />
            <div className="font-display text-2xl sm:text-3xl font-semibold text-foreground">{s.value}</div>
            <div className="text-sm text-foreground-muted mt-1">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

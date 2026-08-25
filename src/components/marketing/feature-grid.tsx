import { Compass, MapPinned, Sparkles, Plane, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Compass,
    title: "Personalized Discovery",
    description: "The platform learns what you love — your interests, budget, and personality shape every recommendation.",
    accent: "ember" as const,
  },
  {
    icon: MapPinned,
    title: "Real-World Experiences",
    description: "No endless scrolling. Discover things worth actually doing, from hidden gems to weekend adventures.",
    accent: "forest" as const,
  },
  {
    icon: Sparkles,
    title: "Intelligent Recommendations",
    description: "Get a short list of experiences you'll genuinely love, with the reasoning behind every pick.",
    accent: "gold" as const,
  },
  {
    icon: Plane,
    title: "Travel",
    description: "Landing somewhere new? Get personalized itineraries and hidden gems the moment you arrive.",
    accent: "forest" as const,
  },
  {
    icon: TrendingUp,
    title: "Your Life, Personalized",
    description: "The more you use REAL, the better it gets — every save, skip, and trip refines what comes next.",
    accent: "ember" as const,
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
      <div className="max-w-2xl mb-14">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">
          Discovery that actually knows you
        </h2>
        <p className="mt-4 text-foreground-muted text-lg">
          Not another search engine. A recommendation engine built around who you are.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
            <div
              className="h-11 w-11 rounded-full flex items-center justify-center mb-4"
              style={{
                background: `var(--${f.accent}-soft)`,
                color: `var(--${f.accent}${f.accent === "gold" ? "" : "-strong"})`,
              }}
            >
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">{f.title}</h3>
            <p className="text-foreground-muted text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Compass, MapPinned, Sparkles, Plane, TrendingUp } from "lucide-react";
import { brand } from "@/lib/config/brand";

// The two real differentiators — reasoning per pick, and a system that
// gets sharper with use — get larger, ember-bordered cards and top billing
// instead of being lost among 5 equal-weight cards (previously "Your Life,
// Personalized" was position 5 of 5, the learning loop was step 4 of 4 in
// How It Works, and nothing on the page visually distinguished it from a
// generic feature like "Travel").
const HIGHLIGHTED = [
  {
    icon: Sparkles,
    title: "Intelligent Recommendations",
    description: "Get a short list of experiences you'll genuinely love, with the reasoning behind every pick.",
    subtext: "Not a rating. An actual reason, in plain language, every time.",
  },
  {
    icon: TrendingUp,
    title: "Your Life, Personalized",
    description: `The more you use ${brand.name}, the better it gets — every save, skip, and trip refines what comes next.`,
    subtext: "No other tool gets sharper the more you use it.",
  },
];

const SECONDARY = [
  {
    icon: Compass,
    title: "Personalized Discovery",
    description: "The platform learns what you love — your interests, budget, and personality shape every recommendation.",
  },
  {
    icon: MapPinned,
    title: "Real-World Experiences",
    description: "No endless scrolling. Discover things worth actually doing, from hidden gems to weekend adventures.",
  },
  {
    icon: Plane,
    title: "Travel",
    description: "Landing somewhere new? Get personalized itineraries and hidden gems the moment you arrive.",
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-surface-sunken">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
        <div className="max-w-2xl mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">
            Discovery that actually knows you
          </h2>
          <p className="mt-4 text-foreground-muted text-lg">
            Not another search engine. A recommendation engine built around who you are.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          {HIGHLIGHTED.map((f) => (
            <div key={f.title} className="rounded-[var(--radius-lg)] border-2 border-ember bg-surface p-6 sm:p-8">
              <f.icon className="h-8 w-8 text-ember mb-4" strokeWidth={1.75} />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-foreground-muted leading-relaxed">{f.description}</p>
              <p className="text-sm text-ember font-medium mt-3">{f.subtext}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {SECONDARY.map((f) => (
            <div key={f.title}>
              <f.icon className="h-6 w-6 text-foreground-muted mb-4" strokeWidth={1.75} />
              <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-foreground-muted text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

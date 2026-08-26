import { Compass, MapPinned, Sparkles, Plane, TrendingUp } from "lucide-react";
import { brand } from "@/lib/config/brand";

const FEATURES = [
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
    icon: Sparkles,
    title: "Intelligent Recommendations",
    description: "Get a short list of experiences you'll genuinely love, with the reasoning behind every pick.",
  },
  {
    icon: Plane,
    title: "Travel",
    description: "Landing somewhere new? Get personalized itineraries and hidden gems the moment you arrive.",
  },
  {
    icon: TrendingUp,
    title: "Your Life, Personalized",
    description: `The more you use ${brand.name}, the better it gets — every save, skip, and trip refines what comes next.`,
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <f.icon className="h-6 w-6 text-ember mb-4" strokeWidth={1.75} />
            <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">{f.title}</h3>
            <p className="text-foreground-muted text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Compass, MapPinned, Sparkles, Plane, TrendingUp } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SectionGlow } from "@/components/marketing/section-glow";
import { Reveal } from "@/components/marketing/reveal";
import { FeatureCard } from "@/components/marketing/feature-card";

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
    <section className="relative overflow-hidden bg-background">
      <SectionGlow tone="ember" side="top-right" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Why Zolo"
            title="Discovery that actually knows you"
            subtitle="Not another search engine. A recommendation engine built around who you are."
            className="mb-14"
          />
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-5 mb-5">
          {HIGHLIGHTED.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <FeatureCard
                icon={<f.icon strokeWidth={1.75} />}
                title={f.title}
                description={f.description}
                subtext={f.subtext}
                highlighted
              />
            </Reveal>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECONDARY.map((f, i) => (
            <Reveal key={f.title} delay={0.16 + i * 0.08}>
              <FeatureCard icon={<f.icon strokeWidth={1.75} />} title={f.title} description={f.description} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

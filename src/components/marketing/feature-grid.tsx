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
const RECOMMENDATIONS = {
  icon: Sparkles,
  title: "Intelligent Recommendations",
  description: "Get a short list of experiences you'll genuinely love, with the reasoning behind every pick.",
  subtext: "Not a rating. An actual reason, in plain language, every time.",
};

const PERSONALIZED = {
  icon: TrendingUp,
  title: "Your Life, Personalized",
  description: `The more you use ${brand.name}, the better it gets — every save, skip, and trip refines what comes next.`,
  subtext: "No other tool gets sharper the more you use it.",
};

const DISCOVERY = {
  icon: Compass,
  title: "Personalized Discovery",
  description: "The platform learns what you love — your interests, budget, and personality shape every recommendation.",
};
const REAL_WORLD = {
  icon: MapPinned,
  title: "Real-World Experiences",
  description: "No endless scrolling. Discover things worth actually doing, from hidden gems to weekend adventures.",
};
const TRAVEL = {
  icon: Plane,
  title: "Travel",
  description: "Landing somewhere new? Get personalized itineraries and hidden gems the moment you arrive.",
};

// A real UI snippet, not just icon+text -- the same reasoning-chip pattern
// real cards use elsewhere (see product-preview.tsx / experience-card.tsx),
// scaled down. "Rooftop jazz bar" is a category description, not a named
// business -- illustrating the pattern, not claiming a specific real place.
function ReasoningPreview() {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-foreground">Rooftop jazz bar</span>
        <span className="shrink-0 text-[11px] font-semibold text-ember bg-[var(--ember-soft)] rounded-full px-2 py-0.5">
          94% match
        </span>
      </div>
      <p className="text-xs text-foreground-muted">Matches your interests: music, nightlife — fits your usual budget</p>
    </div>
  );
}

// A genuinely uneven bento (one 3-wide/2-tall anchor card, not a perfect
// 2x2/3x1 grid split) -- real bento layouts on the reference sites vary
// cell size for rhythm, they don't just tile equal boxes with different
// content in them.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <Reveal className="lg:col-span-3 lg:row-span-2">
            <FeatureCard
              icon={<RECOMMENDATIONS.icon strokeWidth={1.75} />}
              title={RECOMMENDATIONS.title}
              description={RECOMMENDATIONS.description}
              subtext={RECOMMENDATIONS.subtext}
              preview={<ReasoningPreview />}
              highlighted
              className="lg:h-full"
            />
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-2">
            <FeatureCard
              icon={<PERSONALIZED.icon strokeWidth={1.75} />}
              title={PERSONALIZED.title}
              description={PERSONALIZED.description}
              subtext={PERSONALIZED.subtext}
              highlighted
            />
          </Reveal>

          <Reveal delay={0.16} className="lg:col-span-2">
            <FeatureCard
              icon={<DISCOVERY.icon strokeWidth={1.75} />}
              title={DISCOVERY.title}
              description={DISCOVERY.description}
            />
          </Reveal>

          <Reveal delay={0.24} className="sm:col-span-1 lg:col-span-3">
            <FeatureCard
              icon={<REAL_WORLD.icon strokeWidth={1.75} />}
              title={REAL_WORLD.title}
              description={REAL_WORLD.description}
            />
          </Reveal>
          <Reveal delay={0.32} className="sm:col-span-1 lg:col-span-2">
            <FeatureCard
              icon={<TRAVEL.icon strokeWidth={1.75} />}
              title={TRAVEL.title}
              description={TRAVEL.description}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

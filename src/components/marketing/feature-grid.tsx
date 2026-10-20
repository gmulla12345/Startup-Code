import type { ReactNode } from "react";
import { Compass, MapPinned, Sparkles, Plane, TrendingUp, Music, Palette, Mountain, Coffee } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { PickRow, PickTile, MOCK_PICKS, type MockTone } from "@/components/marketing/mock-ui";

// The two real differentiators -- reasoning per pick, and a system that gets
// sharper with use -- lead the grid and get the richest visuals, instead of
// being lost among five equal-weight cards.
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
  // Was "No other tool gets sharper the more you use it" -- an absolute claim
  // contradicted by any competitor with a learning component (including
  // Google Maps), flagged in the legal risk review (finding 6, Lanham Act
  // §43(a)). Replaced with a claim about Zolo's own product only.
  subtext: "Every save and skip sharpens what comes next.",
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

function Card({
  icon: Icon,
  title,
  description,
  subtext,
  visual,
  className,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  subtext?: string;
  visual: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-raised)] sm:p-8",
        className
      )}
    >
      <span
        aria-hidden
        className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-primary"
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-md leading-relaxed text-foreground-muted">{description}</p>
      {subtext && <p className="mt-3 text-sm font-medium text-primary">{subtext}</p>}
      <div className="mt-auto pt-7">{visual}</div>
    </div>
  );
}

// Each visual is a tiny live-rendered slice of the real product, in the same
// vocabulary as the hero mockup. They're decorative (aria-hidden): the card's
// heading and description carry the meaning. Picks are category descriptions,
// not named businesses, and each one that shows a score says "Example".
const panel = "rounded-2xl border border-border bg-surface-sunken p-4";

function ReasoningVisual() {
  const [first, ...rest] = MOCK_PICKS;
  return (
    <div aria-hidden className={cn(panel, "bg-gradient-to-br from-[#e8f7f4] via-white to-[#f0f5ff] p-5")}>
      <p className="mb-3 text-[11px] font-semibold text-foreground-muted">For you tonight</p>
      <PickRow pick={first} />
      <div className="my-3 rounded-xl border border-dashed border-[#a6dcd2] bg-[var(--primary-soft)]/60 p-3.5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Why this pick
        </p>
        <p className="mt-1 text-sm text-foreground">
          Matches your interests: music, nightlife — fits your usual budget
        </p>
      </div>
      <div className="space-y-2.5">
        {rest.map((pick) => (
          <PickRow key={pick.id} pick={pick} />
        ))}
      </div>
      <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Example</p>
    </div>
  );
}

function TasteVisual() {
  const bars = [
    { label: "Music", pct: 92 },
    { label: "Food & drink", pct: 74 },
    { label: "Outdoors", pct: 51 },
    { label: "Nightlife", pct: 28 },
  ];
  return (
    <div aria-hidden className={panel}>
      <p className="mb-3 text-[11px] font-semibold text-foreground-muted">What Zolo has learned about you</p>
      <div className="space-y-2.5">
        {bars.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-foreground-muted">{b.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
              <span className="mk-gradient block h-full rounded-full" style={{ width: `${b.pct}%` }} />
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Example</p>
    </div>
  );
}

function ChipsVisual() {
  const chips = ["Music", "Food", "Outdoors", "Art", "Wellness", "$$ budget", "Social", "Spontaneous"];
  const on = new Set(["Music", "Food", "$$ budget", "Spontaneous"]);
  return (
    <div aria-hidden className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={c}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            on.has(c) ? "border-transparent bg-foreground text-white" : "border-border bg-surface text-foreground-muted"
          )}
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function CategoriesVisual() {
  const items: { label: string; tag: string; tone: MockTone; icon: typeof Music }[] = [
    { label: "Live jazz night", tag: "Hidden gem", tone: "night", icon: Music },
    { label: "Pottery workshop", tag: "Weekend", tone: "arts", icon: Palette },
    { label: "Sunrise ridge hike", tag: "Free", tone: "outdoor", icon: Mountain },
    { label: "Neighborhood café crawl", tag: "Low-key", tone: "arts", icon: Coffee },
  ];
  return (
    <div aria-hidden className={panel}>
      <p className="mb-3 text-[11px] font-semibold text-foreground-muted">Worth doing this weekend</p>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
            <PickTile tone={it.tone} icon={it.icon} className="h-9 w-9 rounded-lg" />
            <span className="flex-1 truncate text-sm font-medium text-foreground">{it.label}</span>
            <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-foreground-muted">{it.tag}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Example</p>
    </div>
  );
}

function ItineraryVisual() {
  const stops = [
    { time: "9:00", label: "Morning coffee near your hotel" },
    { time: "11:30", label: "Neighborhood walking tour" },
    { time: "13:30", label: "Lunch somewhere locals love" },
    { time: "16:30", label: "Sunset viewpoint" },
    { time: "19:00", label: "Hidden-gem dinner" },
  ];
  return (
    <div aria-hidden className={panel}>
      <p className="mb-3 text-[11px] font-semibold text-foreground-muted">Day 1</p>
      <ol className="relative space-y-3 border-l border-border-strong pl-4">
        {stops.map((s) => (
          <li key={s.time} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-surface" />
            <span className="text-[11px] font-semibold text-primary">{s.time}</span>
            <p className="text-xs text-foreground">{s.label}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Example</p>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Why Zolo"
            title="Discovery that actually knows you"
            subtitle="Not another search engine. A recommendation engine built around who you are."
            className="mb-14"
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-6">
          <Reveal className="lg:col-span-3 lg:row-span-2">
            <Card {...RECOMMENDATIONS} visual={<ReasoningVisual />} />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-3">
            <Card {...PERSONALIZED} visual={<TasteVisual />} />
          </Reveal>
          <Reveal delay={0.16} className="lg:col-span-3">
            <Card {...DISCOVERY} visual={<ChipsVisual />} />
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-3">
            <Card {...REAL_WORLD} visual={<CategoriesVisual />} />
          </Reveal>
          <Reveal delay={0.16} className="lg:col-span-3">
            <Card {...TRAVEL} visual={<ItineraryVisual />} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

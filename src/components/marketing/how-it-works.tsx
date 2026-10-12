"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Heart, Shuffle, X } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { AppWindow, ExampleNote, MOCK_PICKS, MatchPill, PickRow, PickTile } from "@/components/marketing/mock-ui";

const STEPS = [
  {
    number: "01",
    title: "Tell us who you are",
    description: "A quick, visual onboarding — interests, personality, budget, and what you're hoping to get more of.",
  },
  {
    number: "02",
    title: "Get matched instantly",
    description: "We match you to real places nearby based on your answers, then use AI to sharpen the picks and explain each one.",
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

const STEP_MS = 7000;

// ---------------------------------------------------------------------------
// The four panels shown in the product window, one per step. Each is a small
// live-rendered slice of the real flow (onboarding, ranked matches, the
// save/skip/go actions, the feedback loop) -- designed markup, not a
// screenshot and not live data, so this section can never render empty the
// way the old "real places" preview did when the Google account had a hold.
// ---------------------------------------------------------------------------

const INTERESTS = ["Music", "Food & drink", "Outdoors", "Art", "Nightlife", "Wellness", "Sports", "History"];
const BUDGETS = ["$", "$$", "$$$", "$$$$"];

function PanelOnboarding() {
  // Genuinely clickable: it's the one step where "try it" is the point.
  const [picked, setPicked] = useState<Set<string>>(new Set(["Music", "Food & drink", "Outdoors"]));
  const [budget, setBudget] = useState("$$");

  function toggle(label: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div className="p-5 sm:p-6">
      <p className="text-xs font-semibold text-ember">Step 1 of 3 · Your interests</p>
      <p className="mt-1 font-display text-xl font-semibold text-foreground">What do you want more of?</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {INTERESTS.map((label) => {
          const on = picked.has(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
                on
                  ? "border-transparent bg-foreground text-white"
                  : "border-border bg-surface text-foreground-muted hover:border-border-strong"
              )}
            >
              {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              {label}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-xs font-semibold text-foreground-muted">Usual budget</p>
      <div className="mt-2 inline-flex rounded-full border border-border bg-surface-sunken p-1">
        {BUDGETS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBudget(b)}
            aria-pressed={budget === b}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              budget === b ? "bg-surface text-foreground shadow-[var(--shadow-card)]" : "text-foreground-muted"
            )}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <span className="text-xs text-foreground-subtle">{picked.size} selected</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-4 py-2 text-sm font-medium text-white">
          Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function PanelMatched() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ember">Matched for you</p>
          <p className="mt-1 font-display text-xl font-semibold text-foreground">3 picks, each with a reason</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-foreground-muted sm:inline-flex">
          AI explains every pick
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {MOCK_PICKS.map((pick, i) => (
          <motion.div
            key={pick.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <PickRow pick={pick} />
            <div className="mx-1 mt-1.5 h-1 overflow-hidden rounded-full bg-border">
              <motion.div
                className="mk-gradient h-full origin-left rounded-full"
                style={{ width: `${pick.match}%` }}
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.25 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      <ExampleNote className="mt-4 text-center" />
    </div>
  );
}

function PanelDiscover() {
  const [saved, setSaved] = useState(false);
  const pick = MOCK_PICKS[1];
  return (
    <div className="p-5 sm:p-6">
      <p className="text-xs font-semibold text-ember">Discover</p>
      <p className="mt-1 font-display text-xl font-semibold text-foreground">Save it, skip it, or go</p>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <PickTile tone={pick.tone} icon={pick.icon} className="h-14 w-14 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-foreground">{pick.title}</p>
              <MatchPill value={pick.match} />
            </div>
            <p className="mt-1 text-sm text-foreground-muted">{pick.reason}</p>
            <p className="mt-1 text-xs text-foreground-subtle">
              {pick.category} · {pick.meta}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border py-2 text-sm font-medium text-foreground-muted">
            <X className="h-3.5 w-3.5" aria-hidden /> Skip
          </span>
          <button
            type="button"
            onClick={() => setSaved((s) => !s)}
            aria-pressed={saved}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full border py-2 text-sm font-medium transition-all active:scale-95",
              saved ? "border-transparent bg-[var(--ember-soft)] text-ember" : "border-border text-foreground"
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", saved && "fill-current")} aria-hidden /> {saved ? "Saved" : "Save"}
          </button>
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground py-2 text-sm font-medium text-white">
            Go <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-border-strong bg-surface-sunken px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Shuffle className="h-4 w-4 text-ember" aria-hidden /> Surprise Me
        </span>
        <span className="text-xs text-foreground-subtle">Something unexpected</span>
      </div>
      <ExampleNote className="mt-4 text-center" />
    </div>
  );
}

function PanelLearning() {
  const reduceMotion = useReducedMotion();
  // Starts in the original order, then re-ranks a beat after the panel shows --
  // the point of this step is watching feedback change the list. Under
  // prefers-reduced-motion it simply shows the re-ranked result.
  const [timerDone, setTimerDone] = useState(false);
  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setTimeout(() => setTimerDone(true), 1300);
    return () => window.clearTimeout(id);
  }, [reduceMotion]);
  const reranked = timerDone || Boolean(reduceMotion);

  const [jazz, pottery, hike] = MOCK_PICKS;
  const order = reranked ? [pottery, hike, jazz] : [jazz, pottery, hike];
  const scores: Record<string, number> = reranked
    ? { pottery: 97, hike: 92, jazz: 74 }
    : { jazz: 96, pottery: 91, hike: 88 };

  return (
    <div className="p-5 sm:p-6">
      <p className="text-xs font-semibold text-ember">Learning from you</p>
      <p className="mt-1 font-display text-xl font-semibold text-foreground">Your picks re-rank as you go</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-forest">
          <Heart className="h-3 w-3 fill-current" aria-hidden /> Saved: pottery class
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ember-soft)] px-2.5 py-1 text-ember">
          <X className="h-3 w-3" aria-hidden /> Skipped: rooftop jazz bar
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {order.map((pick) => (
          <motion.div
            key={pick.id}
            layout={!reduceMotion}
            transition={{ type: "spring", bounce: 0, duration: 0.6 }}
          >
            <PickRow pick={{ ...pick, match: scores[pick.id] }} />
          </motion.div>
        ))}
      </div>
      <ExampleNote className="mt-4 text-center" />
    </div>
  );
}

const PANELS = [PanelOnboarding, PanelMatched, PanelDiscover, PanelLearning];

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  // Auto-advance until the visitor takes over by clicking a step; it also only
  // runs while the section is on screen (no timers ticking off-screen) and not
  // at all under prefers-reduced-motion.
  const [auto, setAuto] = useState(true);
  const running = auto && inView && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), STEP_MS);
    return () => window.clearTimeout(id);
  }, [running, active]);

  const Panel = PANELS[active];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative overflow-hidden bg-[#0a2540] text-white"
    >
      {/* Decorative: the brand gradient bleeding in from the corners, plus a
          faint grid, behind the content. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#ff4e2b]/25 blur-[120px]" />
        <div className="absolute -bottom-52 right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[#2fc4a3]/20 blur-[130px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <SectionHeading
            inverted
            eyebrow="Process"
            title={`How ${brand.name} works`}
            subtitle="From sign-up to your next adventure, in minutes."
            className="mb-14"
          />
        </Reveal>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <ol aria-label="How it works steps" className="space-y-2">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              return (
                <li key={step.number}>
                <button
                  type="button"
                  aria-current={isActive ? "step" : undefined}
                  onClick={() => {
                    setActive(i);
                    setAuto(false);
                  }}
                  className={cn(
                    "relative flex w-full gap-4 rounded-2xl p-4 text-left transition-colors duration-300 active:scale-[0.99]",
                    isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300",
                      isActive ? "border-transparent bg-[#ff6a45] text-white" : "border-white/20 text-[#a9b8cc]"
                    )}
                  >
                    {step.number}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block font-display text-base font-semibold transition-colors duration-300",
                        isActive ? "text-white" : "text-[#c5d1e0]"
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-[#a9b8cc]">{step.description}</span>
                  </span>
                  {/* Progress rail for the running step: a thin bar that fills
                      over STEP_MS, restarting whenever the step changes. */}
                  {isActive && running && (
                    <span aria-hidden className="absolute inset-x-4 bottom-0 h-px overflow-hidden bg-white/10">
                      <span
                        key={active}
                        className="block h-full origin-left bg-[#ff6a45]"
                        style={{ animation: `mk-progress ${STEP_MS}ms linear forwards` }}
                      />
                    </span>
                  )}
                </button>
                </li>
              );
            })}
          </ol>

          <div className="lg:pl-2">
            <AppWindow url="discoverzolo.com" className="min-h-[392px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.55)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <Panel />
                </motion.div>
              </AnimatePresence>
            </AppWindow>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart, Mic, Search, Shuffle } from "lucide-react";
import { AppWindow, ExampleNote, MOCK_PICKS, PickRow, PickTile } from "@/components/marketing/mock-ui";

/**
 * The hero's product shot: the real Discover UI's structure (search, the For
 * You / Popular / Hidden Gems switch, ranked picks with a reason on each)
 * rendered as markup, angled in 3D like a floating dashboard, with two
 * smaller cards drifting in front of it (a "Surprise Me" pick and a "Saved"
 * confirmation). It replaces the old full-bleed night photo, which said
 * nothing about what the product actually does.
 *
 * Entrance is a staggered rise; the floating cards then bob slowly via CSS.
 * Both are dropped under prefers-reduced-motion.
 */
export function HeroMockup() {
  const reduceMotion = useReducedMotion();

  const rise = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <div className="relative mx-auto w-full max-w-[560px] lg:ml-auto lg:mr-0">
      <div className="lg:[transform:perspective(1800px)_rotateY(-7deg)_rotateX(2deg)]">
        <motion.div {...rise(0.15)}>
          <AppWindow>
            <div className="space-y-3 bg-surface-sunken/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-xs text-foreground-subtle">
                <Search className="h-3.5 w-3.5" aria-hidden />
                Search experiences, places, cities…
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                <span className="rounded-full bg-foreground px-3 py-1.5 text-white">For You</span>
                <span className="rounded-full px-3 py-1.5 text-foreground-muted">Popular</span>
                <span className="rounded-full px-3 py-1.5 text-foreground-muted">Hidden Gems</span>
              </div>
              <div className="space-y-2.5">
                {MOCK_PICKS.map((pick, i) => (
                  <motion.div key={pick.id} {...rise(0.35 + i * 0.12)}>
                    <PickRow pick={pick} />
                  </motion.div>
                ))}
              </div>
              <ExampleNote className="pt-0.5 text-center" />
            </div>
          </AppWindow>
        </motion.div>
      </div>

      <motion.div {...rise(0.85)} className="absolute -top-5 right-2 z-10 sm:-right-5">
        <div className="animate-mk-float flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-medium text-foreground shadow-[var(--shadow-raised)]">
          <Heart className="h-3.5 w-3.5 fill-[var(--brand-pink)] text-[var(--brand-pink)]" aria-hidden />
          Saved to your list
        </div>
      </motion.div>

      <motion.div {...rise(1)} className="absolute -bottom-28 left-2 z-10 sm:-bottom-[7.25rem] sm:-left-10">
        <div
          className="animate-mk-float w-[256px] rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-raised)]"
          style={{ animationDelay: "-3s" }}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <Shuffle className="h-3.5 w-3.5" aria-hidden />
            Surprise Me
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <PickTile tone="night" icon={Mic} className="h-10 w-10" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">Open-mic comedy night</p>
              <p className="text-[11px] text-foreground-muted">Something unexpected, 1.2 mi away</p>
            </div>
          </div>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Example</p>
        </div>
      </motion.div>
    </div>
  );
}

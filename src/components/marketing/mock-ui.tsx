import type { ComponentType, ReactNode } from "react";
import { Music, Palette, Mountain } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared building blocks for the landing page's product mockups (hero,
 * feature cards, How It Works). Everything here is live-rendered markup using
 * the same tokens as the real app, never a screenshot -- so it can't go stale
 * the way a hand-captured image would, and it doesn't depend on live Google
 * data (or a working Google billing account) to render.
 *
 * Honesty rules carried over from the legal risk review, which still apply to
 * every mockup built from these: the picks are CATEGORY descriptions ("Rooftop
 * jazz bar"), never named real businesses; match percentages are illustrative;
 * and every mockup that shows one is labeled with <ExampleNote /> so it can't
 * be read as a personal result for whoever is looking at the page.
 */

export type MockTone = "night" | "arts" | "outdoor";

export interface MockPick {
  id: string;
  title: string;
  category: string;
  reason: string;
  meta: string;
  match: number;
  tone: MockTone;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const MOCK_PICKS: MockPick[] = [
  {
    id: "jazz",
    title: "Rooftop jazz bar",
    category: "Nightlife",
    reason: "Matches your interests: music, nightlife",
    meta: "$$ · 0.8 mi",
    match: 96,
    tone: "night",
    icon: Music,
  },
  {
    id: "pottery",
    title: "Hands-on pottery class",
    category: "Arts & Culture",
    reason: "Matches your interests: art, learning",
    meta: "$$ · 2.1 mi",
    match: 91,
    tone: "arts",
    icon: Palette,
  },
  {
    id: "hike",
    title: "Sunrise ridge hike",
    category: "Outdoors",
    reason: "Fits your usual budget: free",
    meta: "Free · 4.2 mi",
    match: 88,
    tone: "outdoor",
    icon: Mountain,
  },
];

// Soft, saturated gradients for the category tiles -- these are decoration
// (white icon on top), not text colors, so they don't need to meet text
// contrast on their own.
export const TONE_GRADIENT: Record<MockTone, string> = {
  night: "from-[#6d5dfc] to-[#ff4f93]",
  arts: "from-[#ffb340] to-[#ff6a45]",
  outdoor: "from-[#1fb89a] to-[#4cc9f0]",
};

export function PickTile({
  tone,
  icon: Icon,
  className,
}: {
  tone: MockTone;
  icon: MockPick["icon"];
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
        TONE_GRADIENT[tone],
        className
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </span>
  );
}

export function MatchPill({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-primary",
        className
      )}
    >
      {value}% match
    </span>
  );
}

export function PickRow({ pick, className }: { pick: MockPick; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]",
        className
      )}
    >
      <PickTile tone={pick.tone} icon={pick.icon} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{pick.title}</p>
          <MatchPill value={pick.match} />
        </div>
        <p className="mt-0.5 truncate text-xs text-foreground-muted">{pick.reason}</p>
        <p className="mt-1 text-[11px] text-foreground-subtle">
          {pick.category} · {pick.meta}
        </p>
      </div>
    </div>
  );
}

/** Required on any mockup showing a match score -- see the file comment. */
export function ExampleNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] font-medium uppercase tracking-wide text-foreground-subtle", className)}>
      Example — not a live result for you
    </p>
  );
}

/** A light app-window frame: muted traffic-light dots + an address pill. */
export function AppWindow({
  children,
  url = "discoverzolo.com/discover",
  className,
}: {
  children: ReactNode;
  url?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-raised)]",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-surface-sunken px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#d5dbe5]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d5dbe5]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d5dbe5]" />
        </div>
        <div className="flex flex-1 justify-center">
          <div className="max-w-[240px] truncate rounded-full border border-border bg-surface px-4 py-1 text-[11px] text-foreground-subtle">
            {url}
          </div>
        </div>
        <div className="w-10" aria-hidden />
      </div>
      {children}
    </div>
  );
}

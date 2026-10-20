import type { CSSProperties } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A match score, drawn as a ring in the brand gradient with the number beside it.
 * This is one of the few things that is Zolo's own on the inside: the ring fills as
 * the score rises, in the same orange-to-pink-to-gold as the landing page's gradient.
 * It sits on a white chip, because it is usually laid over a photograph.
 *
 * The ring is decoration (aria-hidden); the words carry the meaning.
 */
export function MatchBadge({ score, className }: { score: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(100, score)));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/95 py-1 pl-1 pr-2.5 text-xs font-semibold text-foreground shadow-sm",
        className
      )}
    >
      <span className="match-ring h-5 w-5" style={{ "--p": pct } as CSSProperties} aria-hidden>
        <span />
      </span>
      {pct}% match
    </span>
  );
}

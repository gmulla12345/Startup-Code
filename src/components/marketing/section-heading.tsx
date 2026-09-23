import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The small uppercase label + heading + subhead pattern every reference
 * site (Linear, Stripe) uses at the top of a section -- the eyebrow label
 * is what was missing before: without it every section jumped straight
 * from a large heading with nothing establishing what "category" of
 * content is coming, which read flatter than it needed to. Left-aligned by
 * default on purpose (not every section should center its text against a
 * photo-heavy page -- reserve `center` for short, punchy standalone
 * statements).
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ember mb-3">{eyebrow}</p>
      )}
      {/* tracking-tight: large display text reads as too loosely spaced at
          this size without a touch of negative tracking -- the eyebrow
          above does the opposite (positive tracking) for the same reason at
          its much smaller size. */}
      <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground leading-tight tracking-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-foreground-muted text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

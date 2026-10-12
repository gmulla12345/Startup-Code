import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The small colored label + heading + subhead pattern every reference site
 * (Stripe, Linear) uses at the top of a section -- the eyebrow establishes
 * what "category" of content is coming before the heading lands. Left-aligned
 * by default; reserve `center` for short, punchy standalone statements.
 * `inverted` is for sections on a dark band (white heading, softer subhead).
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  inverted = false,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className={cn("text-sm font-semibold mb-3", inverted ? "text-[#ff9b7d]" : "text-ember")}>{eyebrow}</p>
      )}
      <h2
        className={cn(
          "font-display text-balance text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold leading-[1.1] tracking-tight",
          inverted ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn("mt-4 max-w-2xl text-pretty text-lg leading-relaxed", align === "center" && "mx-auto", inverted ? "text-[#a9b8cc]" : "text-foreground-muted")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

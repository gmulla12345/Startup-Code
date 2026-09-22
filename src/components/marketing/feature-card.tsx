"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// `icon` takes an already-rendered element (<Sparkles />), not a component
// reference -- this file is a Client Component (framer-motion needs the
// browser), and its caller (feature-grid.tsx) is a Server Component. A raw
// component reference can't cross that boundary as a prop (RSC requires
// serializable props), but a rendered element can. The icon's color still
// responds to `group-hover` below via plain CSS `currentColor` inheritance
// -- lucide icons stroke with currentColor by default, so the color class
// only needs to live on this wrapping div, not the icon element itself.
export function FeatureCard({
  icon,
  title,
  description,
  subtext,
  highlighted = false,
  preview,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  subtext?: string;
  highlighted?: boolean;
  /** Optional real-UI snippet rendered below the copy -- gives the card's
   * primary differentiator actual visual weight instead of icon+text
   * repeated at every size, without needing a second full mockup. */
  preview?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative flex h-full flex-col rounded-[var(--radius-lg)] border bg-surface p-6 sm:p-8 transition-colors duration-300",
        highlighted
          ? "border-ember/40 hover:border-ember"
          : "border-border hover:border-border-strong",
        className
      )}
    >
      <div
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] mb-5 transition-colors duration-300 [&_svg]:h-5 [&_svg]:w-5",
          highlighted ? "bg-[var(--ember-soft)] text-ember" : "bg-surface-sunken text-foreground-muted group-hover:bg-[var(--ember-soft)] group-hover:text-ember"
        )}
      >
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className={cn("text-foreground-muted leading-relaxed", highlighted ? "" : "text-sm")}>{description}</p>
      {subtext && <p className="text-sm text-ember font-medium mt-3">{subtext}</p>}
      {preview && <div className="mt-auto pt-6">{preview}</div>}
    </motion.div>
  );
}

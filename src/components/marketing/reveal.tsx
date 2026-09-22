"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fades + rises its children into place the first time they scroll into
 * view, via framer-motion's viewport-triggered animation (real spring-eased
 * motion, not just a CSS class toggle). The wrapped content still renders
 * fully in the initial HTML -- this only animates opacity/transform, never
 * conditionally mounts anything -- so there's no SEO or no-JS regression.
 * `delay` lets callers stagger a run of siblings (e.g. grid cards) without
 * each one needing its own bespoke transition config.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

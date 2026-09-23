"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// The exact "urban night stroll" reference photo the user supplied --
// copied into public/hero/ rather than linked remotely, same treatment as
// any other user-supplied brand asset. User confirmed it's free to use/
// download (sourced via Godly AI).
const HERO_IMAGE = "/hero/urban-night-stroll.webp";

// Badge pill stays dropped per the 2026-09-22 simplification request -- that
// part of the change is untouched. The subhead itself was lengthened back out
// on 2026-09-23 in response to a heycatch site-audit finding (D1.1/D1.2/D2.1):
// the one-sentence version scored worse on 5-second comprehension for dropping
// ICP naming ("young professionals") and the "endless scrolling"/"decision
// fatigue" pain language the previous, longer version had. H1 is untouched --
// still inside the 2026-09-01 headline A/B window noted elsewhere in this
// file's history.
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  // Tracks scroll progress across exactly the hero's own height -- 0 when
  // its top hits the viewport top, 1 once its bottom has scrolled past --
  // rather than the whole page's scroll, so the effect is scoped to the
  // hero-to-next-section transition the user asked for, not a full-page
  // parallax that would keep animating long after the hero is offscreen.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  // Image drifts down and zooms in slowly (classic parallax: the
  // background moves slower than the foreground scroll), while the copy
  // fades and rises away faster -- text dissolves first, the photo lingers
  // a beat longer, then the page hands off to the next section. Kept
  // subtle (18% drift, 1.08x zoom) for the same reason every other motion
  // primitive on this page is restrained: barely-there reads as polish,
  // exaggerated reads as a gimmick.
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-[#0e0c09] min-h-[600px] h-[86vh] max-h-[840px] flex items-end">
      <motion.div style={{ y: imageY, scale: imageScale }} className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_28%] sm:object-[58%_32%]"
        />
      </motion.div>

      {/* One continuous top-to-bottom scrim, not two separate bands -- the
          content block is bottom-anchored (flex items-end) and tall enough
          that two independently-sized top/bottom gradients either left a
          fully-clear (illegible-text) gap in the middle where the content
          actually sits, or double-stacked into a flat black rectangle.
          Explicit percentage stops instead of Tailwind's from/via/to (which
          only gives 3 fixed points) for real control over where the darken
          ramps up relative to where the copy actually sits. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,6,4,0.10) 0%, rgba(8,6,4,0.15) 14%, rgba(8,6,4,0.55) 38%, rgba(8,6,4,0.86) 64%, rgba(8,6,4,0.95) 100%)",
        }}
      />

      <motion.div
        style={{ opacity: contentOpacity, y: contentY }}
        className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-14 md:pb-20 text-center"
      >
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-[#f6f1e7] leading-[1.05] [text-shadow:0_4px_24px_rgba(0,0,0,0.45)]">
          <span className="block text-lg sm:text-xl font-medium text-[#e4dbc9] mb-2">Discover Zolo</span>
          Stop deciding. Start{" "}
          <span className="bg-gradient-to-r from-[#ff6a45] to-[#f0bc4e] bg-clip-text text-transparent">doing</span>.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#e4dbc9] max-w-2xl mx-auto [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
          No more endless scrolling or decision fatigue — a short, curated list of things to do, matched to your
          interests, budget, and personality. Built for young professionals who want more from their free time.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/signup">
              Start Discovering <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/25 text-[#f6f1e7] hover:bg-white/10">
            <a href="#how-it-works">Explore</a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

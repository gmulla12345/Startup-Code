"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
];

// Below either threshold the drawer snaps back open instead of closing --
// judging by velocity as well as distance means a fast short flick commits
// to closing just as readily as a slow drag past the offset, matching how
// a real swipe-to-dismiss gesture is judged (not position alone).
const CLOSE_OFFSET = -80;
const CLOSE_VELOCITY = -500;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Fully opaque, not translucent -- a semi-transparent sticky nav lets
  // whatever scrolls underneath (e.g. the homepage's dark full-bleed hero
  // photo) show/bleed through at the boundary, which reads as a rendering
  // glitch rather than a deliberate glass effect.
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((link) =>
            link.href.startsWith("/#") ? (
              <a key={link.href} href={link.href} className="text-sm font-medium text-foreground-muted hover:text-foreground">
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-foreground-muted hover:text-foreground">
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start Discovering</Link>
          </Button>
        </div>

        <button
          className="md:hidden p-2.5 -mr-2.5 flex items-center justify-center transition-transform active:scale-90"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {/* A quick cross-fade + quarter-turn instead of an instant icon
              swap -- the toggle is a state change too, not just the panel
              it drives, and active:scale-90 fires the instant the button is
              pressed rather than waiting for the click to commit. */}
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={open ? "close" : "open"}
              initial={{ opacity: 0, rotate: reduceMotion ? 0 : -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: reduceMotion ? 0 : 45 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.18, ease: "easeOut" }}
              className="flex"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* Scrim -- dims the page behind the drawer (Apple's "dim to
                focus" material pattern) instead of the old behavior of
                pushing page content down when the panel mounted inline. */}
            <motion.div
              key="scrim"
              className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
              onClick={() => setOpen(false)}
            />

            {/* Panel enters and exits along the same vertical path (slides
                down from behind the header, slides back up to dismiss) --
                critically damped (bounce: 0) so a plain tap-open settles
                without overshoot, per the skill's default. Still draggable:
                dragConstraints pin it at rest, dragElastic only gives on the
                "top" edge (toward closing) so pulling down against an
                already-open panel feels solid while pulling up rubber-bands,
                and onDragEnd commits to closing using real offset/velocity
                instead of a fixed animation, so the close motion originates
                from wherever the panel actually is when released, not a
                scripted replay. */}
            <motion.div
              key="panel"
              className="md:hidden fixed inset-x-0 top-16 z-40 border-b border-border bg-surface px-4 py-4 space-y-4 shadow-[var(--shadow-raised)]"
              style={{ transformOrigin: "top" }}
              initial={reduceMotion ? { opacity: 0 } : { y: "-100%" }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: reduceMotion ? 0.15 : 0.35 }}
              drag={reduceMotion ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.6, bottom: 0 }}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (info.offset.y < CLOSE_OFFSET || info.velocity.y < CLOSE_VELOCITY) setOpen(false);
              }}
            >
              {LINKS.map((link) =>
                link.href.startsWith("/#") ? (
                  <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-foreground">
                    {link.label}
                  </Link>
                )
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button asChild variant="outline">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Start Discovering</Link>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

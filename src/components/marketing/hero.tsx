import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroMockup } from "@/components/marketing/hero-mockup";

// Product-first hero, in the Stripe mold: headline and one clear action on the
// left, a floating product shot on the right, a vivid brand gradient sweeping
// in behind the top corner. It replaces the old full-bleed night photo, which
// carried no information about what Zolo does.
//
// Copy is unchanged from the audited version (heycatch D1.1/D1.2/D2.1): the
// subhead names the audience ("young professionals") and the pain ("endless
// scrolling", "decision fatigue") that the one-sentence version lost, and "Discover
// Zolo" stays inside the H1 so the brand name is part of the page's primary
// heading. Server component on purpose: the copy is plain HTML and the only
// client code is the mockup.
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Decorative backdrop: faint grid fading out from the left, the brand
          gradient as one skewed band off the top-right corner, and a fade to
          the page color at the bottom so the next section starts clean. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px] overflow-hidden">
        <div className="mk-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_25%_30%,black,transparent)]" />
        {/* Feathered on its left side (mask) so it fades into the white behind the
            headline instead of ending in a hard edge across the copy. */}
        <div
          className="mk-gradient absolute -top-[22%] -right-[6%] hidden h-[82%] w-[62%] -skew-y-[11deg] opacity-90 [mask-image:linear-gradient(to_right,transparent_0%,black_42%)] lg:block"
          style={{ transformOrigin: "top right" }}
        />
        {/* Phones: the band would run straight through the paragraph, so it is
            replaced by a soft pastel glow in the corner -- same colors, but
            pale enough that body text stays well above AA contrast. */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,#ff9468_0%,#ff4f93_45%,transparent_70%)] opacity-35 blur-2xl lg:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-40 pt-14 sm:px-6 md:pb-32 md:pt-24 lg:grid-cols-[1fr_1.05fr] lg:gap-10">
        <div className="max-w-xl">
          <div
            className="mk-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-foreground-muted backdrop-blur"
            style={{ ["--d" as string]: "0s" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--zolo-orange-deep)]" aria-hidden />
            Personalized discovery, free to start
          </div>

          <h1
            className="mk-rise mt-6 font-display text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.25rem]"
            style={{ ["--d" as string]: "0.08s" }}
          >
            <span className="mb-3 block text-lg font-medium tracking-normal text-foreground-muted sm:text-xl">
              Discover Zolo
            </span>{" "}
            Stop deciding. Start <span className="mk-gradient-text">doing</span>.
          </h1>

          <p
            className="mk-rise mt-6 text-lg leading-relaxed text-foreground-muted sm:text-xl"
            style={{ ["--d" as string]: "0.16s" }}
          >
            No more endless scrolling or decision fatigue — a short, curated list of things to do, matched to your
            interests, budget, and personality. Built for young professionals who want more from their free time.
          </p>

          <div className="mk-rise mt-9 flex flex-col gap-3 sm:flex-row" style={{ ["--d" as string]: "0.24s" }}>
            <Button asChild size="lg">
              {/* COPY: the hero button now leads to a first list, no account needed */}
              <Link href="/start">
                Get your first list <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-surface/70 backdrop-blur">
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <p
            className="mk-rise mt-5 flex items-center gap-1.5 text-sm text-foreground-subtle"
            style={{ ["--d" as string]: "0.3s" }}
          >
            {/* COPY: the line under the hero buttons */}
            <Check className="h-4 w-4 text-[var(--zolo-orange-deep)]" aria-hidden /> No account needed for your first list
          </p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

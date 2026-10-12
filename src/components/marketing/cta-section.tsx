import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/marketing/magnetic";
import { Reveal } from "@/components/marketing/reveal";

// The closing bookend: a deep navy panel with the brand gradient glowing up
// from its bottom edge. Navy (not the bright gradient itself) sits behind the
// text so white-on-background contrast is solid everywhere; the vivid color is
// purely atmosphere.
export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6 md:pb-28">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#0a2540] px-8 py-16 text-center sm:py-24">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="mk-gradient absolute inset-x-0 bottom-0 h-44 [mask-image:linear-gradient(to_top,black_25%,transparent)]" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_70%)]" />
          </div>

          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Stop scrolling. Start <span className="mk-gradient-text">experiencing</span>.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-[#b7c4d6]">
            Your next favorite memory is one recommendation away.
          </p>
          <Magnetic className="mt-9 inline-block">
            <Button asChild size="lg">
              <Link href="/signup">
                Start Discovering <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Magnetic>
          <p className="mt-4 text-xs text-[#8fa1b8]">No credit card required</p>
        </div>
      </Reveal>
    </section>
  );
}

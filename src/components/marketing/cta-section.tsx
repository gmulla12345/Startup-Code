import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/marketing/magnetic";
import { Reveal } from "@/components/marketing/reveal";

// The closing bookend to the hero -- deliberately echoes it (dark panel,
// Fraunces headline, ember/gold gradient accent word, a soft glow instead
// of the old flat solid-ember box) rather than introducing a third visual
// language this late in the page.
export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[#14120f] px-8 py-16 sm:py-24 text-center border border-white/10">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-1/2 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full blur-3xl animate-glow-drift"
            style={{
              background:
                "radial-gradient(circle, rgba(255,106,69,0.22) 0%, rgba(240,188,78,0.12) 45%, rgba(240,188,78,0) 70%)",
            }}
          />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-5xl font-semibold text-[#f6f1e7] max-w-2xl mx-auto leading-tight">
              Stop scrolling. Start{" "}
              <span className="bg-gradient-to-r from-[#ff6a45] to-[#f0bc4e] bg-clip-text text-transparent">
                experiencing
              </span>
              .
            </h2>
            <p className="text-[#e4dbc9] mt-4 max-w-lg mx-auto text-lg">
              Your next favorite memory is one recommendation away.
            </p>
            <Magnetic className="inline-block mt-8">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start Discovering <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <p className="mt-4 text-xs text-[#8a8071]">No credit card required</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

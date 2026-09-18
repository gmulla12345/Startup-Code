import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroRecommendationPreview } from "@/components/marketing/hero-recommendation-preview";
import type { Experience } from "@/types/database";

// Deliberately forced dark regardless of the visitor's light/dark preference
// (a self-contained dark hero on an otherwise light-first site, same pattern
// many SaaS landing pages use) — literal hex values below are Zolo's own
// existing dark-theme palette from globals.css (:root[data-theme="dark"]),
// not new colors invented for this section, so the hero can never drift out
// of sync with the rest of the brand's dark mode. No radial glow/background
// gradient here on purpose — see hero.tsx history for why ("take the fade
// away" feedback from earlier in the project); the gradient treatment below
// lives only on the accent word and the CTA button, not the backdrop.
export function Hero({ previewExperiences }: { previewExperiences: Experience[] }) {
  return (
    <section className="relative overflow-hidden bg-[#14120f]">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#453d2f] bg-[#221e18] px-4 py-1.5 text-xs font-medium text-[#b8ae9b] mb-6">
              <Star className="h-3.5 w-3.5 fill-[#f0bc4e] text-[#f0bc4e]" />
              Personalized discovery, built for real life
            </div>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-[#f6f1e7] leading-[1.05]">
              <span className="block text-lg sm:text-xl font-medium text-[#b8ae9b] mb-2">Discover Zolo</span>
              Stop deciding. Start{" "}
              <span className="bg-gradient-to-r from-[#ff6a45] to-[#f0bc4e] bg-clip-text text-transparent">
                doing
              </span>
              .
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-[#b8ae9b] max-w-xl">
              Zolo gives you a short, curated list of experiences matched to your interests, budget, and
              personality — with a reason for every pick. Zolo is revolutionizing personalized discovery,
              turning decision fatigue into a two-minute decision. Built for young professionals who want
              more from their free time.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#ff6a45] to-[#f0bc4e] text-[#14120f] hover:opacity-90"
              >
                <Link href="/signup">
                  Start Discovering <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-[#453d2f] text-[#f6f1e7] hover:bg-[#221e18]">
                <a href="#how-it-works">Explore</a>
              </Button>
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] ring-1 ring-white/10 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.6)]">
            <HeroRecommendationPreview experiences={previewExperiences} />
          </div>
        </div>
      </div>
    </section>
  );
}

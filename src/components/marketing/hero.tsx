import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPhotoCollage } from "@/components/marketing/hero-photo-collage";
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
//
// Centered copy block + a full-width real-photo collage below it, instead
// of the old left-copy/right-panel split — headline and subhead copy is
// UNCHANGED (still mid-measurement, see CLAUDE.md's hero A/B test note),
// only the surrounding layout changed.
export function Hero({ previewExperiences }: { previewExperiences: Experience[] }) {
  return (
    <section className="relative overflow-hidden bg-[#14120f]">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#453d2f] bg-[#221e18] px-4 py-1.5 text-xs font-medium text-[#b8ae9b] mb-6">
          <Star className="h-3.5 w-3.5 fill-[#f0bc4e] text-[#f0bc4e]" />
          Personalized discovery, built for real life
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-[#f6f1e7] leading-[1.05]">
          <span className="block text-lg sm:text-xl font-medium text-[#b8ae9b] mb-2">Discover Zolo</span>
          Stop deciding. Start{" "}
          <span className="bg-gradient-to-r from-[#ff6a45] to-[#f0bc4e] bg-clip-text text-transparent">doing</span>.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#b8ae9b] max-w-2xl mx-auto">
          Zolo gives you a short, curated list of experiences matched to your interests, budget, and
          personality — with a reason for every pick. Zolo is revolutionizing personalized discovery,
          turning decision fatigue into a two-minute decision. Built for young professionals who want
          more from their free time.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/signup">
              Start Discovering <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#453d2f] text-[#f6f1e7] hover:bg-[#221e18]">
            <a href="#how-it-works">Explore</a>
          </Button>
        </div>
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pb-20 md:pb-28">
        <HeroPhotoCollage experiences={previewExperiences} />
      </div>
    </section>
  );
}

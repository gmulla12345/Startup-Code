import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

// The exact "urban night stroll" reference photo the user supplied --
// copied into public/hero/ rather than linked remotely, same treatment as
// any other user-supplied brand asset. User confirmed it's free to use/
// download (sourced via Godly AI).
const HERO_IMAGE = "/hero/urban-night-stroll.webp";

// Full-bleed photo hero, replacing the old flat-color-background + small
// photo-collage layout. Headline/subhead copy is UNCHANGED (still
// mid-measurement, see CLAUDE.md's hero A/B test note) -- only the visual
// container changed. The photo collage that used to live inside this
// section moved to its own section right below (see (marketing)/page.tsx) --
// per explicit feedback, the hero itself should be one clean, immersive
// image, not the image plus a grid of thumbnails competing for attention.
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0e0c09] min-h-[600px] h-[86vh] max-h-[840px] flex items-end">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[62%_28%] sm:object-[58%_32%]"
      />

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

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-14 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#14120f]/70 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-[#e4dbc9] mb-6">
          <Star className="h-3.5 w-3.5 fill-[#f0bc4e] text-[#f0bc4e]" />
          Personalized discovery, built for real life
        </div>

        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-[#f6f1e7] leading-[1.05] [text-shadow:0_4px_24px_rgba(0,0,0,0.45)]">
          <span className="block text-lg sm:text-xl font-medium text-[#e4dbc9] mb-2">Discover Zolo</span>
          Stop deciding. Start{" "}
          <span className="bg-gradient-to-r from-[#ff6a45] to-[#f0bc4e] bg-clip-text text-transparent">doing</span>.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#e4dbc9] max-w-2xl mx-auto [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
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
          <Button asChild size="lg" variant="outline" className="border-white/25 text-[#f6f1e7] hover:bg-white/10">
            <a href="#how-it-works">Explore</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

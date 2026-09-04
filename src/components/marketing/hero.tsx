import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroRecommendationPreview } from "@/components/marketing/hero-recommendation-preview";
import type { Experience } from "@/types/database";

export function Hero({ previewExperiences }: { previewExperiences: Experience[] }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--forest-soft),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-1.5 text-xs font-medium text-foreground-muted mb-6">
              <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
              Personalized discovery, built for real life
            </div>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight text-foreground leading-[1.05]">
              Stop deciding. Start doing.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-foreground-muted max-w-xl">
              Zolo gives you a short, curated list of experiences matched to your interests, budget, and
              personality — with a reason for every pick. Built for young professionals who want more from
              their free time.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start Discovering <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">Explore</a>
              </Button>
            </div>
          </div>

          <HeroRecommendationPreview experiences={previewExperiences} />
        </div>
      </div>
    </section>
  );
}

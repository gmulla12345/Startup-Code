import Image from "next/image";
import { Search, Star, Heart, SlidersHorizontal } from "lucide-react";
import { BrowserFrame } from "@/components/marketing/browser-frame";
import { formatCategoryLabel, formatPrice, withMaxWidth } from "@/lib/utils/format";
import type { Experience } from "@/types/database";

// Match %s and the "matches your interests" framing are illustrative, not a
// live result for whoever's viewing this page -- but the language is the
// real language: scoreExperience() in
// src/services/recommendation/scoring.ts literally produces "Matches your
// interests: X, Y" / "Fits your usual budget" as real reasons, and the
// category shown is each experience's actual category, not invented. Same
// honesty rule the old hero mockup used: real places, real photos,
// illustrative-but-representative reasoning, never dressed up as a
// personal result for this specific visitor.
const MATCH_SCORES = [96, 91];

function MiniCard({ experience, matchScore }: { experience: Experience; matchScore: number }) {
  const image = experience.images[0];
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface overflow-hidden">
      <div className="relative aspect-[16/10] w-full bg-surface-sunken">
        {image && (
          <Image
            src={withMaxWidth(image, 500)}
            alt={experience.title}
            fill
            sizes="280px"
            className="object-cover"
          />
        )}
        <span className="absolute top-2 left-2 rounded-full bg-white/95 text-[#e63f1d] text-[11px] font-semibold px-2 py-0.5">
          {matchScore}% match
        </span>
        <span className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center">
          <Heart className="h-3 w-3 text-[#1b1712]" />
        </span>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-medium text-foreground-subtle uppercase tracking-wide mb-0.5">
          {formatCategoryLabel(experience.category)}
        </p>
        <p className="font-display text-sm font-semibold text-foreground line-clamp-1 mb-1">{experience.title}</p>
        <div className="flex items-center gap-2 text-xs text-foreground-muted mb-1.5">
          {experience.rating && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
              {experience.rating.toFixed(1)}
            </span>
          )}
          <span>{formatPrice(experience.priceEstimate, experience.priceLevel)}</span>
        </div>
        <p className="text-[11px] text-ember font-medium">
          Matches your interests: {formatCategoryLabel(experience.category).toLowerCase()}
        </p>
      </div>
    </div>
  );
}

export function ProductPreview({ experiences }: { experiences: Experience[] }) {
  const picks = experiences.filter((e) => e.images[0]).slice(0, 2);
  if (picks.length < 2) return null;

  return (
    <BrowserFrame className="w-full">
      <div className="p-4 sm:p-5 bg-[#1c1914]">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs text-[#8a8071]">
            <Search className="h-3.5 w-3.5" />
            Search experiences, places, cities...
          </div>
          <div className="hidden sm:flex items-center rounded-full bg-white/5 p-0.5 text-[11px] font-medium">
            <span className="rounded-full bg-ember text-white px-2.5 py-1.5">For You</span>
            <span className="px-2.5 py-1.5 text-[#8a8071]">Popular</span>
            <span className="px-2.5 py-1.5 text-[#8a8071]">Hidden Gems</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4 text-[#8a8071]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-[11px] rounded-full bg-white/10 text-[#f6f1e7] px-2.5 py-1">All</span>
          <span className="text-[11px] rounded-full px-2.5 py-1">Food &amp; Drink</span>
          <span className="hidden sm:inline text-[11px] rounded-full px-2.5 py-1">Arts &amp; Culture</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {picks.map((exp, i) => (
            <MiniCard key={exp.id} experience={exp} matchScore={MATCH_SCORES[i]} />
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

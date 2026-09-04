import Image from "next/image";
import { Heart, Gem, Shuffle } from "lucide-react";
import { formatCategoryLabel } from "@/lib/utils/format";
import type { Experience } from "@/types/database";

// Illustrative only — real places, real photos, but the match % and
// reasoning are example copy showing how personalization looks, not a
// live recommendation for any specific visitor.
const PREVIEW_REASONING = [
  { match: 96, reason: "Because you love outdoor adventure and have a $50 budget" },
  { match: 91, reason: "Because it's 10 minutes away and matches your interests" },
  { match: 88, reason: "Because you haven't tried this category yet, and it's highly rated" },
];

/**
 * Shows what using Zolo actually looks like — real places pulled from the
 * same live catalog as the rest of the homepage, laid out like the real
 * recommendation screen (match %, reasoning, save, Surprise Me). Replaces
 * the old 4-photo aspirational Unsplash grid, which showed activities but
 * never the product itself.
 */
export function HeroRecommendationPreview({ experiences }: { experiences: Experience[] }) {
  if (experiences.length < 3) return null;
  const rows = experiences.slice(0, 3).map((experience, i) => ({ experience, ...PREVIEW_REASONING[i] }));

  return (
    <div className="rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-raised)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-sunken">
        <span className="text-sm font-semibold text-foreground">Discover</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ember text-white text-xs font-semibold px-3 py-1.5">
          <Shuffle className="h-3 w-3" /> Surprise Me
        </span>
      </div>

      <div className="divide-y divide-border">
        {rows.map(({ experience, match, reason }) => (
          <div key={experience.id} className="flex items-start gap-3 p-4">
            <div className="relative h-16 w-16 shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-surface-sunken">
              {experience.images[0] && (
                <Image src={experience.images[0]} alt="" fill sizes="64px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm text-foreground truncate">{experience.title}</p>
                <span className="shrink-0 text-xs font-semibold text-ember bg-[var(--ember-soft)] rounded-full px-2 py-0.5">
                  {match}% match
                </span>
              </div>
              <p className="text-xs text-foreground-subtle mt-0.5">
                {experience.isHiddenGem ? (
                  <span className="inline-flex items-center gap-1 text-[color:var(--gold)]">
                    <Gem className="h-3 w-3" /> Hidden gem
                  </span>
                ) : (
                  formatCategoryLabel(experience.category)
                )}
              </p>
              <p className="text-xs text-foreground-muted mt-1 line-clamp-1">{reason}</p>
            </div>
            <Heart className="h-4 w-4 text-foreground-subtle shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

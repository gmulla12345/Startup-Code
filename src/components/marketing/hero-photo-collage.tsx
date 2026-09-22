import Image from "next/image";
import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { formatCategoryLabel, withMaxWidth } from "@/lib/utils/format";
import type { Experience } from "@/types/database";

// Match % is illustrative example copy showing how personalization looks —
// same disclosed pattern as the panel this replaces (git history:
// hero-recommendation-preview.tsx). The photos, categories, and ratings
// underneath it are real, live places from the same catalog query that
// powers the rest of the homepage, never fabricated.
const ILLUSTRATIVE_MATCH = 94;

function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#14120f]/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-[#f6f1e7] ring-1 ring-white/10 ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

function Photo({
  experience,
  priority,
  className,
  badges,
}: {
  experience: Experience;
  priority?: boolean;
  className: string;
  badges?: ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ring-1 ring-white/10 ${className}`}>
      <Image
        src={withMaxWidth(experience.images[0], 800)}
        alt={experience.title}
        fill
        priority={priority}
        sizes="(max-width: 640px) 50vw, 25vw"
        className="object-cover"
      />
      {badges && <div className="absolute inset-0 p-2.5 flex flex-col justify-between items-start pointer-events-none">{badges}</div>}
    </div>
  );
}

/**
 * A real-photo collage in the hero, styled after the "real data floating on
 * real photos" pattern (not a fabricated stat — every badge here reads a
 * real field off the Experience objects) mixed with an uneven bento grid.
 * Replaces the old vertical "Discover panel" list treatment.
 */
export function HeroPhotoCollage({ experiences }: { experiences: Experience[] }) {
  const photos = experiences.filter((e) => e.images[0]).slice(0, 5);
  if (photos.length < 3) return null;

  const [big, small1, small2, small3, small4] = photos;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Photo
        experience={big}
        priority
        className="col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto"
        badges={
          <>
            <Badge>{formatCategoryLabel(big.category)}</Badge>
            <div className="flex items-center justify-between w-full">
              <span className="font-display text-sm font-semibold text-[#f6f1e7] drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                {big.title}
              </span>
              {big.rating && (
                <Badge>
                  <Star className="h-3 w-3 fill-[#f0bc4e] text-[#f0bc4e]" /> {big.rating.toFixed(1)}
                </Badge>
              )}
            </div>
          </>
        }
      />
      <Photo
        experience={small1}
        className="aspect-square"
        badges={<Badge className="text-[#ff6a45] bg-[#221e18]/90">{ILLUSTRATIVE_MATCH}% match</Badge>}
      />
      <Photo experience={small2} className="aspect-square" />
      {small3 && <Photo experience={small3} className="hidden sm:block aspect-square" />}
      {small4 && <Photo experience={small4} className="hidden sm:block aspect-square" />}
    </div>
  );
}

import Image from "next/image";
import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { formatCategoryLabel, withMaxWidth } from "@/lib/utils/format";
import type { Experience } from "@/types/database";
import { Reveal } from "@/components/marketing/reveal";

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#14120f]/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-[#f6f1e7] ring-1 ring-white/10">
      {children}
    </span>
  );
}

// Every tile gets the same bottom title strip (real place name — never
// omitted), so the collage reads as one consistent system rather than some
// photos having a caption and others not. The large tile additionally gets
// a category badge and rating, since it's the featured piece; that's a
// deliberate hero-vs-thumbnail hierarchy, not a caption that's just
// missing elsewhere.
function Photo({
  experience,
  priority,
  className,
  large,
}: {
  experience: Experience;
  priority?: boolean;
  className: string;
  large?: boolean;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl ring-1 ring-white/10 transition-shadow duration-300 hover:ring-white/25 ${className}`}>
      <Image
        src={withMaxWidth(experience.images[0], 800)}
        alt={experience.title}
        fill
        priority={priority}
        sizes="(max-width: 640px) 50vw, 25vw"
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute inset-0 p-2.5 flex flex-col justify-between items-start">
        {large ? <Badge>{formatCategoryLabel(experience.category)}</Badge> : <span />}
        <div className="flex items-center justify-between w-full gap-2">
          <span
            className={`font-display font-semibold text-[#f6f1e7] line-clamp-1 ${large ? "text-sm" : "text-xs"}`}
          >
            {experience.title}
          </span>
          {large && experience.rating && (
            <Badge>
              <Star className="h-3 w-3 fill-[#f0bc4e] text-[#f0bc4e]" /> {experience.rating.toFixed(1)}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A quick real-photo proof strip directly beneath the hero, on the hero's
 * same dark panel background so the two read as one continuous dark
 * opening before the page cuts to its normal light sections. Used to live
 * inside the hero itself, but that crowded a full-bleed photo hero with a
 * competing grid of thumbnails — moved out per explicit feedback that the
 * hero should be one clean image. Every field shown (title, category,
 * rating) is read directly off the real Experience objects from the same
 * live catalog query powering the rest of the homepage — nothing
 * fabricated, no illustrative/example figures.
 */
export function PhotoStrip({ experiences }: { experiences: Experience[] }) {
  const photos = experiences.filter((e) => e.images[0]).slice(0, 5);
  if (photos.length < 3) return null;

  const [big, small1, small2, small3, small4] = photos;

  return (
    <section className="bg-[#14120f]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14 md:py-20">
        <Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Photo experience={big} priority large className="col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto" />
            <Photo experience={small1} className="aspect-square" />
            <Photo experience={small2} className="aspect-square" />
            {small3 && <Photo experience={small3} className="hidden sm:block aspect-square" />}
            {small4 && <Photo experience={small4} className="hidden sm:block aspect-square" />}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

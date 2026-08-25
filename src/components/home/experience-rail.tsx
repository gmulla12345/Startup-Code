import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ExperienceCard } from "@/components/experience/experience-card";
import type { Experience } from "@/types/database";

export interface RailItem {
  experience: Experience;
  matchScore?: number;
  reasoning?: string;
  distanceLabel?: string;
}

export function ExperienceRail({
  title,
  subtitle,
  items,
  seeAllHref,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  items: RailItem[];
  seeAllHref?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0 && !emptyMessage) return null;

  return (
    <section className="py-2">
      <div className="flex items-end justify-between mb-4 px-1">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-foreground-muted mt-0.5">{subtitle}</p>}
        </div>
        {seeAllHref && items.length > 0 && (
          <Link href={seeAllHref} className="text-sm font-medium text-ember inline-flex items-center gap-0.5 shrink-0">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-foreground-muted px-1">{emptyMessage}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 snap-x">
          {items.map((item) => (
            <div key={item.experience.id} className="w-[280px] shrink-0 snap-start">
              <ExperienceCard
                experience={item.experience}
                matchScore={item.matchScore}
                reasoning={item.reasoning}
                distanceLabel={item.distanceLabel}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

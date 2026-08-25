"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Share2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatPrice, formatDuration, formatCategoryLabel } from "@/lib/utils/format";
import type { Experience } from "@/types/database";
import { track } from "@/services/analytics/track";
import { shareEntity } from "@/lib/utils/share";
import { toast } from "sonner";

interface ExperienceCardProps {
  experience: Experience;
  matchScore?: number;
  reasoning?: string;
  distanceLabel?: string;
  saved?: boolean;
  onToggleSave?: (id: string, nextSaved: boolean) => void;
  className?: string;
  priority?: boolean;
}

export function ExperienceCard({
  experience,
  matchScore,
  reasoning,
  distanceLabel,
  saved = false,
  onToggleSave,
  className,
  priority = false,
}: ExperienceCardProps) {
  const [isSaved, setIsSaved] = useState(saved);
  const image = experience.images[0];

  function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    onToggleSave?.(experience.id, next);
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    shareEntity({
      title: experience.title,
      text: experience.shortDescription,
      url: `${window.location.origin}/experience/${experience.slug}`,
    });
    track("shared_experience", experience.id);
    toast.success("Link copied — share it anywhere.");
  }

  return (
    <Link
      href={`/experience/${experience.slug}`}
      onClick={() => track("viewed_experience", experience.id, { source: "card" })}
      className={cn(
        "group block rounded-[var(--radius-lg)] overflow-hidden border border-border bg-surface shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
        {image && (
          <Image
            src={image}
            alt={experience.title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        <div className="absolute top-3 left-3 flex gap-2">
          {matchScore != null && (
            <Badge variant="ember" className="backdrop-blur-sm bg-[var(--ember-soft)]/95 font-semibold">
              {Math.round(matchScore)}% match
            </Badge>
          )}
          {experience.isHiddenGem && <Badge variant="gold">Hidden gem</Badge>}
        </div>

        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={handleSave}
            aria-label={isSaved ? "Unsave" : "Save"}
            className="h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={cn("h-4 w-4", isSaved ? "fill-ember text-ember" : "text-foreground")} />
          </button>
          <button
            onClick={handleShare}
            aria-label="Share"
            className="h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Share2 className="h-4 w-4 text-foreground" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3">
          <Badge variant="default" className="bg-black/60 text-white backdrop-blur-sm">
            {formatCategoryLabel(experience.category)}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2">
            {experience.title}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-sm text-foreground-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {distanceLabel ?? experience.city}
          </span>
          {experience.rating && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
              {experience.rating.toFixed(1)}
            </span>
          )}
          {experience.durationMinutes && <span>{formatDuration(experience.durationMinutes)}</span>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold text-foreground">{formatPrice(experience.priceEstimate, experience.priceLevel)}</span>
        </div>

        {reasoning && (
          <p className="text-xs text-foreground-muted italic border-t border-border pt-2 line-clamp-2">
            &ldquo;{reasoning}&rdquo;
          </p>
        )}
      </div>
    </Link>
  );
}

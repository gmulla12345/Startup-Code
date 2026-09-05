"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Heart, MapPin, Star, Gem } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatPrice, formatDuration, formatCategoryLabel } from "@/lib/utils/format";
import type { Experience } from "@/types/database";
import { track } from "@/services/analytics/track";

interface ExperienceCardProps {
  experience: Experience;
  matchScore?: number;
  reasoning?: string;
  distanceLabel?: string;
  saved?: boolean;
  completed?: boolean;
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
  completed = false,
  onToggleSave,
  className,
  priority = false,
}: ExperienceCardProps) {
  const [isSaved, setIsSaved] = useState(saved);
  const image = experience.images[0];

  // Previously this only flipped local state and called an onToggleSave prop
  // that no caller ever actually passed — every card's heart button looked
  // functional but never persisted a save anywhere. Now it calls /api/saved
  // directly (same as the experience detail page's ActionBar), including the
  // tags/category the taste-learning scoring reads back later.
  async function handleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    onToggleSave?.(experience.id, next);

    try {
      if (next) {
        const res = await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experienceId: experience.id, tags: experience.tags, category: experience.category }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`/api/saved?experienceId=${encodeURIComponent(experience.id)}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      }
    } catch {
      setIsSaved(!next);
      toast.error("Couldn't update your saves. Try again.");
    }
  }

  return (
    <Link
      href={`/experience/${experience.slug}`}
      onClick={() => track("viewed_experience", experience.id, { source: "card" })}
      className={cn(
        "group block rounded-[var(--radius-lg)] overflow-hidden border border-border bg-surface transition-shadow hover:shadow-[var(--shadow-raised)]",
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

        {matchScore != null && (
          <div className="absolute top-3 left-3">
            <Badge variant="ember" className="bg-white/95 font-semibold shadow-sm">
              {Math.round(matchScore)}% match
            </Badge>
          </div>
        )}

        {matchScore == null && completed && (
          <div className="absolute top-3 left-3">
            <Badge variant="forest" className="bg-white/95 font-semibold shadow-sm">
              <CheckCircle2 className="h-3 w-3" /> Completed
            </Badge>
          </div>
        )}

        <button
          onClick={handleSave}
          aria-label={isSaved ? "Unsave" : "Save"}
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center transition-colors hover:bg-white"
        >
          <Heart className={cn("h-4 w-4", isSaved ? "fill-ember text-ember" : "text-foreground")} />
        </button>
      </div>

      <div className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground-subtle uppercase tracking-wide">
          {experience.isHiddenGem ? (
            <span className="inline-flex items-center gap-1 text-[color:var(--gold)]">
              <Gem className="h-3 w-3" /> Hidden gem
            </span>
          ) : (
            <span>{formatCategoryLabel(experience.category)}</span>
          )}
        </div>

        <h3 className="font-display text-lg font-semibold leading-tight text-foreground line-clamp-2">
          {experience.title}
        </h3>

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

        <p className="font-semibold text-foreground pt-0.5">{formatPrice(experience.priceEstimate, experience.priceLevel)}</p>

        {reasoning && (
          <p className="text-xs text-foreground-muted line-clamp-2 pt-1">{reasoning}</p>
        )}
      </div>
    </Link>
  );
}

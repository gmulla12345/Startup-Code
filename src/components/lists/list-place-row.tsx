"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Gem, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { formatCategoryLabel, formatPrice, withMaxWidth } from "@/lib/utils/format";
import { track } from "@/services/analytics/track";
import { LocalPickBadge } from "@/components/experience/local-pick-badge";
import { saveCountLine } from "@/lib/config/save-counts";
import type { ListPlaceExperience } from "@/lib/start/types";

/**
 * One place in a list: a photo, the name, a line of facts, and why it is here. The
 * whole row opens the place; the heart saves it (same call the cards make, with the
 * tags and category the taste-learning reads back later). For a visitor with no account
 * the page passes onSaveRequest, and the heart asks for one instead of saving.
 */
export function ListPlaceRow({
  experience,
  index,
  why,
  localPick,
  savedBy,
  distanceLabel,
  matchScore,
  onSaveRequest,
}: {
  experience: ListPlaceExperience;
  /** Zero-based position in the list. */
  index: number;
  why: string | null;
  /** The owner has marked this place as a local pick: shown as a small badge, and only then. */
  localPick?: boolean;
  /** Real students nearby who saved it this week, passed only when enough did. */
  savedBy?: number;
  distanceLabel?: string;
  /** Shown only on the list made from the person's own tastes. */
  matchScore?: number;
  /** If set, the heart calls this instead of saving: there is no account to save to yet. */
  onSaveRequest?: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const rawImage = experience.images[0];
  const image = rawImage ? withMaxWidth(rawImage, 300) : null;

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (onSaveRequest) {
      onSaveRequest();
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      const res = next
        ? await fetch("/api/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ experienceId: experience.id, tags: experience.tags, category: experience.category }),
          })
        : await fetch(`/api/saved?experienceId=${encodeURIComponent(experience.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setSaved(!next);
      toast.error("Couldn't update your saves. Try again.");
    }
  }

  const facts = [distanceLabel ?? experience.city, formatPrice(experience.priceEstimate, experience.priceLevel)].filter(Boolean);

  return (
    <li>
      <Link
        href={`/experience/${experience.slug}`}
        onClick={() => track("viewed_experience", experience.id, { source: "list" })}
        className="group flex items-start gap-4 py-4"
      >
        <span aria-hidden className="font-reason hidden w-5 shrink-0 pt-1 text-xl text-foreground-subtle sm:block">
          {index + 1}
        </span>

        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-sunken">
          {image && (
            <Image
              src={image}
              alt={experience.title}
              width={160}
              height={160}
              sizes="80px"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="block font-display text-base font-semibold leading-snug text-foreground line-clamp-2">{experience.title}</span>
            <button
              onClick={toggleSave}
              aria-label={saved ? "Unsave" : "Save"}
              className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-sunken"
            >
              <Heart className={cn("h-4 w-4", saved ? "fill-[var(--brand-pink)] text-[var(--brand-pink)]" : "text-foreground-muted")} />
            </button>
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
            {localPick && <LocalPickBadge />}
            {experience.isHiddenGem ? (
              <span className="inline-flex items-center gap-1 font-medium text-[color:var(--gold)]">
                <Gem className="h-3 w-3" /> Hidden gem
              </span>
            ) : (
              <span>{formatCategoryLabel(experience.category)}</span>
            )}
            {facts.map((f) => (
              <span key={f} className="before:mr-2 before:content-['·']">
                {f}
              </span>
            ))}
            {matchScore != null && <span className="before:mr-2 before:content-['·']">{`${Math.round(matchScore)}% match`}</span>}
          </span>

          {why && <span className="font-reason mt-1.5 block text-[13px] leading-snug text-foreground-muted">{why}</span>}
          {savedBy != null && <span className="mt-1 block text-xs text-foreground-subtle">{saveCountLine(savedBy)}</span>}
        </span>
      </Link>
    </li>
  );
}

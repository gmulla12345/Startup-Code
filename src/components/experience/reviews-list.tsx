"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { brand } from "@/lib/config/brand";
import type { Review } from "@/types/database";

/**
 * Community notes, now writable in place -- posts to
 * POST /api/experiences/[id]/reviews and prepends the real saved row to
 * local state (same optimistic-append pattern as ActionBar's save/complete
 * toggles), no page reload or refetch needed. Logged-out visitors see a
 * "log in" prompt instead of the form, same redirect-back pattern
 * ActionBar's save/complete buttons already use.
 */
export function ReviewsList({
  experienceId,
  slug,
  initialReviews,
  isAuthenticated,
}: {
  experienceId: string;
  slug: string;
  initialReviews: Review[];
  isAuthenticated: boolean;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Pick a rating first.");
      return;
    }
    if (comment.trim().length < 2) {
      toast.error("Add a quick note before posting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/experiences/${experienceId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() }),
      });
      if (!res.ok) throw new Error();
      const { review } = (await res.json()) as { review: Review };
      setReviews((prev) => [review, ...prev]);
      setRating(0);
      setComment("");
      toast.success("Note added.");
    } catch {
      toast.error("Couldn't add your note. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {isAuthenticated ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 space-y-3"
        >
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              const filled = value <= (hoverRating || rating);
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  className="p-0.5"
                >
                  <Star className={`h-5 w-5 transition-colors ${filled ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border-strong"}`} />
                </button>
              );
            })}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share a tip, a heads-up, or how it went..."
            maxLength={1000}
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={submitting}>
              Post note
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-foreground-muted">Log in to add a community note.</p>
          <Button asChild size="sm" variant="outline">
            <Link href={`/login?redirect=/experience/${slug}`}>Log in</Link>
          </Button>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          No {brand.name} community notes yet — be the first to share your experience.
        </p>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              <Avatar name={review.authorName} size={36} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{review.authorName}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < review.rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border-strong"}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm text-foreground-muted mt-1">{review.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

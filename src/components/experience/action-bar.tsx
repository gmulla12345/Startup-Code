"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareEntity } from "@/lib/utils/share";
import { track } from "@/services/analytics/track";
import { cn } from "@/lib/utils/cn";

export function ActionBar({
  experienceId,
  slug,
  title,
  shortDescription,
  tags,
  category,
  isAuthenticated,
  initialSaved,
  initialCompleted = false,
  externalBookingUrl,
}: {
  experienceId: string;
  slug: string;
  title: string;
  shortDescription: string;
  tags: string[];
  category: string;
  isAuthenticated: boolean;
  initialSaved: boolean;
  initialCompleted?: boolean;
  externalBookingUrl: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(initialCompleted);
  const [markingCompleted, setMarkingCompleted] = useState(false);

  async function toggleSave() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/experience/${slug}`);
      return;
    }

    setSaving(true);
    const next = !saved;
    setSaved(next);

    try {
      if (next) {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experienceId, tags, category }),
        });
        toast.success("Saved");
      } else {
        await fetch(`/api/saved?experienceId=${experienceId}`, { method: "DELETE" });
      }
    } catch {
      setSaved(!next);
      toast.error("Couldn't update your saves. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted() {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/experience/${slug}`);
      return;
    }

    setMarkingCompleted(true);
    const next = !completed;
    setCompleted(next);

    try {
      const res = await fetch("/api/saved", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId, tags, category, status: next ? "completed" : "saved" }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Marked as completed" : "Removed from completed");
      if (next) setSaved(true);
    } catch {
      setCompleted(!next);
      toast.error("Couldn't update. Try again.");
    } finally {
      setMarkingCompleted(false);
    }
  }

  async function handleShare() {
    const result = await shareEntity({
      title,
      text: shortDescription,
      url: `${window.location.origin}/experience/${slug}`,
    });
    if (result === "copied") toast.success("Link copied to clipboard.");
    if (isAuthenticated) track("shared_experience", experienceId);
  }

  function handleBook() {
    if (isAuthenticated) track("clicked_booking", experienceId);
  }

  return (
    <div className="flex items-center gap-3">
      {externalBookingUrl ? (
        <Button asChild size="lg" className="flex-1" onClick={handleBook}>
          <a href={externalBookingUrl} target="_blank" rel="noopener noreferrer">
            Book Now
          </a>
        </Button>
      ) : (
        <Button size="lg" className="flex-1" disabled>
          No live booking available
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={toggleSave} disabled={saving} aria-label="Save">
        <Heart className={saved ? "fill-ember text-ember" : ""} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleCompleted}
        disabled={markingCompleted}
        aria-label={completed ? "Marked as completed" : "Mark as completed"}
        className={cn(completed && "border-forest bg-[var(--forest-soft)]")}
      >
        <CheckCircle2 className={completed ? "fill-forest text-white" : ""} />
      </Button>
      <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share">
        <Share2 />
      </Button>
    </div>
  );
}

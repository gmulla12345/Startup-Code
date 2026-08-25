"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareEntity } from "@/lib/utils/share";
import { track } from "@/services/analytics/track";

export function ActionBar({
  experienceId,
  slug,
  title,
  shortDescription,
  isAuthenticated,
  initialSaved,
  externalBookingUrl,
}: {
  experienceId: string;
  slug: string;
  title: string;
  shortDescription: string;
  isAuthenticated: boolean;
  initialSaved: boolean;
  externalBookingUrl: string | null;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

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
          body: JSON.stringify({ experienceId }),
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
      <Button variant="outline" size="icon" onClick={handleShare} aria-label="Share">
        <Share2 />
      </Button>
    </div>
  );
}

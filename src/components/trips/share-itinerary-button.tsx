"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { shareEntity } from "@/lib/utils/share";
import { brand } from "@/lib/config/brand";

export function ShareItineraryButton({ itineraryId, shareSlug }: { itineraryId: string; shareSlug: string | null }) {
  const [loading, setLoading] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}`, { method: "PATCH" });
      const json = await res.json().catch(() => ({}));
      const slug = json.shareSlug ?? shareSlug ?? itineraryId;

      const url = `${window.location.origin}/share/itinerary/${slug}`;
      const result = await shareEntity({ title: `My ${brand.name} itinerary`, url });
      if (result === "copied") toast.success("Share link copied.");
      if (result === "failed") toast.error("Couldn't copy the link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare} loading={loading}>
      {!loading && <Share2 className="h-4 w-4" />} Share
    </Button>
  );
}

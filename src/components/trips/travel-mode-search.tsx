"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";
import type { DestinationInfo } from "@/services/providers/types";

export function TravelModeSearch({ destinations }: { destinations: DestinationInfo[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = query
    ? destinations.filter((d) => d.city.toLowerCase().includes(query.toLowerCase()))
    : destinations;

  function go(slug: string) {
    router.push(`/travel/${slug}`);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="flex items-center gap-2 mb-4">
        <Plane className="h-5 w-5 text-forest" />
        <h2 className="font-display text-xl font-semibold text-foreground">Travel Mode</h2>
      </div>
      <p className="text-sm text-foreground-muted mb-4">Going somewhere? Get personalized picks the moment you land.</p>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Where are you headed? (e.g. Tokyo)" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="space-y-1">
        {filtered.map((dest) => (
          <button
            key={dest.slug}
            onClick={() => go(dest.slug)}
            className="w-full flex items-center justify-between text-left px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <span className="text-sm font-medium text-foreground">
              {dest.city}, {dest.country}
            </span>
            <ArrowRight className="h-4 w-4 text-foreground-subtle" />
          </button>
        ))}
        {filtered.length === 0 && <p className="text-sm text-foreground-muted px-3 py-2">No matching destinations yet.</p>}
      </div>

      <Button asChild variant="link" className="mt-3">
        <a href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent(`Add ${query.trim() || "a city"} to Travel Mode`)}`}>
          Don&apos;t see your destination? Request it
        </a>
      </Button>
    </div>
  );
}

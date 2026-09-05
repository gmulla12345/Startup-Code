"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DiscoverFilters, type DiscoverFilterState } from "./discover-filters";
import { ExperienceCard } from "@/components/experience/experience-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FREE_TIER_LIMITS } from "@/lib/config/pricing";
import type { Experience } from "@/types/database";
import { analyticsEvents } from "@/services/analytics/track";
import { distanceMiles } from "@/lib/utils/geo";
import { formatDistance } from "@/lib/utils/format";

interface RecommendationLite {
  experienceId: string;
  matchScore: number;
  reasoning: string;
  experience: Experience;
}

export function DiscoverGrid({
  isAuthenticated,
  initialHiddenGemsOnly,
  latitude,
  longitude,
}: {
  isAuthenticated: boolean;
  initialHiddenGemsOnly: boolean;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const [filters, setFilters] = useState<DiscoverFilterState>({
    search: "",
    category: null,
    priceLevel: null,
    indoorOutdoor: "either",
    sort: initialHiddenGemsOnly ? "hidden_gems" : isAuthenticated ? "personalized" : "popular",
  });
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationLite[]>([]);
  const [premium, setPremium] = useState(true);
  const [loading, setLoading] = useState(true);

  const usingPersonalized = filters.sort === "personalized" && isAuthenticated;
  const isCapped = usingPersonalized && !premium && recommendations.length <= FREE_TIER_LIMITS.recommendationsPerWeek;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading state when filters change, before the new fetch
    setLoading(true);

    async function load() {
      if (usingPersonalized) {
        // Free is server-capped to FREE_TIER_LIMITS.recommendationsPerWeek
        // regardless of what's requested here — Premium actually gets this
        // many (up to the real candidate pool for their location/category).
        const res = await fetch("/api/ai/recommendations?surface=for_you&limit=100");
        const json = await res.json();
        if (!cancelled) {
          setRecommendations(json.recommendations ?? []);
          setPremium(Boolean(json.premium));
        }
      } else {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.category) params.set("category", filters.category);
        if (filters.priceLevel) params.set("priceLevel", filters.priceLevel);
        if (filters.sort === "hidden_gems") params.set("hiddenGemsOnly", "true");
        if (latitude != null && longitude != null) {
          params.set("lat", String(latitude));
          params.set("lng", String(longitude));
          params.set("radius", "25");
        }
        params.set("limit", "40");

        const res = await fetch(`/api/experiences?${params.toString()}`);
        const json = await res.json();
        if (!cancelled) setExperiences(json.experiences ?? []);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    if (filters.search) analyticsEvents.searchPerformed(filters.search);
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.category, filters.priceLevel, filters.sort, usingPersonalized, latitude, longitude]);

  const filteredRecommendations = useMemo(() => {
    let list = recommendations;
    if (filters.category) list = list.filter((r) => r.experience.category === filters.category);
    if (filters.priceLevel) list = list.filter((r) => r.experience.priceLevel === filters.priceLevel);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter((r) => r.experience.title.toLowerCase().includes(s));
    }
    return list;
  }, [recommendations, filters]);

  const isFiltering = Boolean(filters.category || filters.priceLevel || filters.search);

  // A recommendation can be a real, correctly-matched place that's still
  // genuinely far away (a different city or county, not just a different
  // neighborhood) — without a distance shown, that's indistinguishable from
  // something around the corner. Same fix as Home's rails.
  function distanceLabelFor(experience: Experience): string | undefined {
    if (latitude == null || longitude == null) return undefined;
    return formatDistance(distanceMiles(latitude, longitude, experience.latitude, experience.longitude));
  }

  return (
    <div className="space-y-6">
      <DiscoverFilters filters={filters} onChange={setFilters} showPersonalized={isAuthenticated} />

      {!loading && isCapped && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-[var(--gold-soft)]/60 px-4 py-3">
          <Sparkles className="h-4 w-4 text-[color:var(--gold)] shrink-0" />
          <p className="text-sm text-foreground flex-1">
            Free plan shows your top {FREE_TIER_LIMITS.recommendationsPerWeek} personalized picks. Browse the full catalog under
            Popular or Hidden Gems, or upgrade for unlimited personalized discovery.
          </p>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/profile/upgrade">Upgrade</Link>
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : usingPersonalized ? (
        filteredRecommendations.length === 0 ? (
          <EmptyState showUpgrade={isCapped && isFiltering} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecommendations.map((r) => (
              <ExperienceCard
                key={r.experienceId}
                experience={r.experience}
                matchScore={r.matchScore}
                reasoning={r.reasoning}
                distanceLabel={distanceLabelFor(r.experience)}
              />
            ))}
          </div>
        )
      ) : experiences.length === 0 ? (
        <EmptyState showUpgrade={false} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((exp) => (
            <ExperienceCard key={exp.id} experience={exp} distanceLabel={distanceLabelFor(exp)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ showUpgrade }: { showUpgrade: boolean }) {
  return (
    <div className="text-center py-16">
      <p className="font-display text-xl font-semibold text-foreground mb-1">Nothing matches yet</p>
      <p className="text-sm text-foreground-muted">
        {showUpgrade
          ? "None of your free personalized picks fit this filter. Try Popular or Hidden Gems to browse everything, or upgrade to Premium for unlimited personalized discovery."
          : "Try a different category or clear your filters."}
      </p>
      {showUpgrade && (
        <Button asChild size="sm" className="mt-4">
          <Link href="/profile/upgrade">Upgrade to Premium</Link>
        </Button>
      )}
    </div>
  );
}

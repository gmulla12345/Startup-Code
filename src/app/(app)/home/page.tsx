import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getRecommendations } from "@/services/recommendation/engine";
import { SurpriseMeButton } from "@/components/home/surprise-me-button";
import { ExperienceRail, type RailItem } from "@/components/home/experience-rail";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance } from "@/lib/utils/format";
import { distanceMiles } from "@/lib/utils/geo";
import type { Profile } from "@/types/database";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) redirect("/onboarding");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <div>
        <p className="text-foreground-muted">{greeting()}, {profile.firstName || "there"}.</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mt-1">
          What should you do today?
        </h1>
      </div>

      <SurpriseMeButton />

      {/*
       * The rails below need AI-reasoned recommendations (a live Claude call
       * plus a Google Places fetch) — that chain alone can take seconds.
       * Streaming it behind Suspense means the greeting and Surprise Me
       * button paint immediately on every navigation to Home instead of the
       * whole page waiting on the slowest data source.
       */}
      <Suspense fallback={<RailsSkeleton />}>
        <RecommendationRails profile={profile} />
      </Suspense>
    </div>
  );
}

async function RecommendationRails({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const recommendations = await getRecommendations(supabase, profile, {
    surfaceContext: "for_you",
    limit: 24,
    useAI: true,
  });

  // Every rail shows distance when we have a location to measure from, not
  // just "Nearby" — a recommendation 17 miles away (a real, correctly-
  // matched place, just genuinely far) looked indistinguishable from
  // something downtown without this, which is exactly what caused real
  // confusion (a Baltimore-based profile getting a Hanover, MD result with
  // no distance shown to explain why it didn't feel local).
  const toItems = (recs: typeof recommendations): RailItem[] =>
    recs.map((r) => ({
      experience: r.experience,
      matchScore: r.matchScore,
      reasoning: r.reasoning,
      distanceLabel:
        profile.latitude != null && profile.longitude != null
          ? formatDistance(
              distanceMiles(profile.latitude, profile.longitude, r.experience.latitude, r.experience.longitude)
            )
          : undefined,
    }));

  const forYou = recommendations.slice(0, 8);

  const nearby =
    profile.latitude != null && profile.longitude != null
      ? [...recommendations]
          .sort(
            (a, b) =>
              distanceMiles(profile.latitude!, profile.longitude!, a.experience.latitude, a.experience.longitude) -
              distanceMiles(profile.latitude!, profile.longitude!, b.experience.latitude, b.experience.longitude)
          )
          .slice(0, 8)
      : [];

  const hiddenGems = recommendations.filter((r) => r.experience.isHiddenGem).slice(0, 8);

  const topInterest = profile.interests[0];
  const becauseYouLike = topInterest
    ? recommendations.filter((r) => r.experience.tags.includes(topInterest)).slice(0, 8)
    : [];

  const weekend = [...recommendations].reverse().slice(0, 8);

  return (
    <div className="space-y-10">
      <ExperienceRail title="For You" subtitle="Picked for who you are" items={toItems(forYou)} seeAllHref="/discover" />

      <ExperienceRail
        title="Nearby"
        subtitle={profile.city ? `Close to ${profile.city}` : undefined}
        items={profile.latitude != null && profile.longitude != null ? toItems(nearby) : []}
        seeAllHref="/map"
        emptyMessage="Add your location in Profile to see what's nearby."
      />

      <ExperienceRail title="This Weekend" subtitle="Worth planning around" items={toItems(weekend)} seeAllHref="/trips" />

      <ExperienceRail
        title="Hidden Gems"
        subtitle="Less obvious, more memorable"
        items={toItems(hiddenGems)}
        seeAllHref="/discover?hiddenGemsOnly=true"
        emptyMessage="Explore more to unlock hidden gems near you."
      />

      {topInterest && (
        <ExperienceRail
          title={`Because you like ${topInterest}`}
          items={toItems(becauseYouLike)}
          emptyMessage=""
        />
      )}
    </div>
  );
}

function RailsSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 3 }).map((_, railIndex) => (
        <div key={railIndex} className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-64 shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

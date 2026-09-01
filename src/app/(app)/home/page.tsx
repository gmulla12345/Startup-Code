import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getRecommendations } from "@/services/recommendation/engine";
import { SurpriseMeButton } from "@/components/home/surprise-me-button";
import { ExperienceRail, type RailItem } from "@/components/home/experience-rail";
import { formatDistance } from "@/lib/utils/format";
import { distanceMiles } from "@/lib/utils/geo";

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

  const recommendations = await getRecommendations(supabase, profile, {
    surfaceContext: "for_you",
    limit: 24,
    useAI: true,
  });

  const toItems = (recs: typeof recommendations): RailItem[] =>
    recs.map((r) => ({ experience: r.experience, matchScore: r.matchScore, reasoning: r.reasoning }));

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <div>
        <p className="text-foreground-muted">{greeting()}, {profile.firstName || "there"}.</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground mt-1">
          What should you do today?
        </h1>
      </div>

      <SurpriseMeButton />

      <div className="space-y-10">
        <ExperienceRail title="For You" subtitle="Picked for who you are" items={toItems(forYou)} seeAllHref="/discover" />

        <ExperienceRail
          title="Nearby"
          subtitle={profile.city ? `Close to ${profile.city}` : undefined}
          items={
            profile.latitude != null && profile.longitude != null
              ? toItems(nearby).map((item) => ({
                  ...item,
                  distanceLabel: formatDistance(
                    distanceMiles(profile.latitude!, profile.longitude!, item.experience.latitude, item.experience.longitude)
                  ),
                }))
              : []
          }
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
    </div>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experience, Profile } from "@/types/database";
import type { RecommendationContext, StructuredRecommendation, SurpriseMeResult } from "@/types/ai";
import { getExperienceProvider } from "@/services/providers";
import { getWeather } from "@/services/providers/weather-provider";
import { rankExperiences } from "./scoring";
import { generateAIRecommendations } from "@/ai/recommend";
import { getRecentEvents, idSetForEventType, summarizeEventsForAI } from "@/lib/repositories/events";
import { getSavedTagCounts } from "@/lib/repositories/saved";

export interface RankedRecommendation extends StructuredRecommendation {
  experience: Experience;
}

type SurfaceContext = "for_you" | "nearby" | "weekend" | "hidden_gem" | "surprise_me" | "because_you_like";

interface EngineOptions {
  surfaceContext: SurfaceContext;
  limit?: number;
  useAI?: boolean;
  additionalExcludeIds?: string[];
}

async function buildContext(
  client: SupabaseClient,
  profile: Profile
): Promise<{ context: RecommendationContext; seenIds: Set<string>; dismissedIds: Set<string>; savedTagCounts: Record<string, number> }> {
  const events = await getRecentEvents(client, profile.userId, 100);
  const seenIds = idSetForEventType(events, "viewed_experience");
  const dismissedIds = idSetForEventType(events, "dismissed_experience");
  const savedTagCounts = await getSavedTagCounts(client, profile.userId);

  const weather =
    profile.latitude != null && profile.longitude != null
      ? await getWeather(profile.latitude, profile.longitude)
      : null;

  const context: RecommendationContext = {
    profile,
    location:
      profile.city && profile.latitude != null && profile.longitude != null
        ? { city: profile.city, latitude: profile.latitude, longitude: profile.longitude }
        : null,
    now: new Date().toISOString(),
    weather,
    budgetOverride: null,
    travelStatus: { isTraveling: false, destinationCity: null },
    recentEvents: summarizeEventsForAI(events),
    excludeExperienceIds: [],
  };

  return { context, seenIds, dismissedIds, savedTagCounts };
}

/**
 * Core hybrid pipeline: structured filtering (provider query) -> scoring
 * (deterministic) -> AI reasoning (optional refinement). Powers Home,
 * Discover's "personalized" sort, and is the base for Surprise Me / Weekend
 * Planner.
 */
export async function getRecommendations(
  client: SupabaseClient,
  profile: Profile,
  options: EngineOptions
): Promise<RankedRecommendation[]> {
  const provider = await getExperienceProvider();
  const { context, seenIds, dismissedIds, savedTagCounts } = await buildContext(client, profile);

  const candidates = await provider.list({
    city: profile.city ?? undefined,
    latitude: profile.latitude ?? undefined,
    longitude: profile.longitude ?? undefined,
    radiusMiles: profile.preferences.maxDistanceMiles * 4, // cast a wider net than strict preference
    hiddenGemsOnly: options.surfaceContext === "hidden_gem" || undefined,
    excludeIds: options.additionalExcludeIds,
    // Candidate pool needs to be at least as large as what was asked for —
    // Premium's much higher Discover limit was previously invisible because
    // this stayed fixed at 60 regardless of options.limit.
    limit: Math.min(Math.max(options.limit ?? 10, 60), 120),
  });

  const ranked = rankExperiences(candidates, profile, { seenIds, dismissedIds, savedTagCounts });
  const topCandidates = ranked.slice(0, Math.max(options.limit ?? 10, 10));

  const recommendations =
    options.useAI === false
      ? topCandidates.map((c) => ({
          experienceId: c.experience.id,
          matchScore: c.score,
          reasoning: c.reasons.join(". "),
          estimatedCost: c.experience.priceEstimate,
          estimatedDurationMinutes: c.experience.durationMinutes,
          recommendedTime: null,
          confidence: 0.6,
        }))
      : await generateAIRecommendations(topCandidates, context);

  return recommendations
    .slice(0, options.limit ?? 10)
    .map((r) => ({
      ...r,
      experience: topCandidates.find((c) => c.experience.id === r.experienceId)!.experience,
    }))
    .filter((r) => Boolean(r.experience));
}

/**
 * Signature "Surprise Me" feature: one recommendation, chosen with a bias
 * toward novelty. excludeIds accumulates across "Not For Me" taps within a
 * single session so the next pick is always different.
 */
export async function getSurpriseMe(
  client: SupabaseClient,
  profile: Profile,
  excludeIds: string[] = []
): Promise<SurpriseMeResult | null> {
  const results = await getRecommendations(client, profile, {
    surfaceContext: "surprise_me",
    limit: 5,
    additionalExcludeIds: excludeIds,
  });

  if (results.length === 0) return null;

  const pick = results[0];
  const hours = new Date().getHours();
  const timeframe = hours < 12 ? "this morning" : hours < 17 ? "this afternoon" : "tonight";

  return {
    experience: pick.experience,
    recommendation: pick,
    headline: pick.experience.isHiddenGem
      ? `You haven't tried this before. Perfect for ${timeframe}.`
      : `Found something great for ${timeframe}.`,
  };
}

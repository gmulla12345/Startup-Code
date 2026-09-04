import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experience, Profile } from "@/types/database";
import type { RecommendationContext, StructuredRecommendation, SurpriseMeResult } from "@/types/ai";
import { getExperienceProvider } from "@/services/providers";
import { getWeather } from "@/services/providers/weather-provider";
import { rankExperiences } from "./scoring";
import { generateAIRecommendations } from "@/ai/recommend";
import {
  getEventExperienceIds,
  getRecentEvents,
  getRejectedAffinity,
  idSetForEventType,
  summarizeEventsForAI,
} from "@/lib/repositories/events";
import { getSavedCategoryCounts, getSavedTagCounts } from "@/lib/repositories/saved";

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

interface BuiltContext {
  context: RecommendationContext;
  seenIds: Set<string>;
  dismissedIds: Set<string>;
  savedTagCounts: Record<string, number>;
  savedCategoryCounts: Record<string, number>;
  rejectedTagCounts: Record<string, number>;
  rejectedCategoryCounts: Record<string, number>;
}

async function buildContext(client: SupabaseClient, profile: Profile): Promise<BuiltContext> {
  const [events, savedTagCounts, savedCategoryCounts, rejected, weather] = await Promise.all([
    getRecentEvents(client, profile.userId, 100),
    getSavedTagCounts(client, profile.userId),
    getSavedCategoryCounts(client, profile.userId),
    getRejectedAffinity(client, profile.userId),
    profile.latitude != null && profile.longitude != null
      ? getWeather(profile.latitude, profile.longitude)
      : Promise.resolve(null),
  ]);
  const seenIds = idSetForEventType(events, "viewed_experience");
  const dismissedIds = idSetForEventType(events, "dismissed_experience");

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

  return {
    context,
    seenIds,
    dismissedIds,
    savedTagCounts,
    savedCategoryCounts,
    rejectedTagCounts: rejected.tagCounts,
    rejectedCategoryCounts: rejected.categoryCounts,
  };
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
  const { context, seenIds, dismissedIds, savedTagCounts, savedCategoryCounts, rejectedTagCounts, rejectedCategoryCounts } =
    await buildContext(client, profile);

  // Only the dedicated "Hidden Gems" rail hard-filters the candidate pool
  // down to isHiddenGem — Surprise Me used to as well, but that meant a
  // well-matched, slightly-more-popular place could never be picked no
  // matter how well it fit. Surprise Me now pulls from the full candidate
  // pool and lets noveltyBias (below) weigh review count/rating as one
  // continuous signal among several, not a pass/fail gate.
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

  const noveltyBias = options.surfaceContext === "surprise_me" || options.surfaceContext === "hidden_gem";
  const ranked = rankExperiences(candidates, profile, {
    seenIds,
    dismissedIds,
    savedTagCounts,
    savedCategoryCounts,
    rejectedTagCounts,
    rejectedCategoryCounts,
    noveltyBias,
  });
  const topCandidates = ranked.slice(0, Math.max(options.limit ?? 10, 10));
  if (topCandidates.length === 0) return [];

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
 * Signature "Surprise Me" feature: one recommendation, biased toward
 * novelty (isHiddenGem plus a continuous low-review-count/rating bonus —
 * see scoreExperience's noveltyBias) rather than the single top-scored,
 * usually-mainstream match that "For You" already leads with. Previously
 * `surfaceContext: "surprise_me"` hard-filtered to isHiddenGem candidates
 * only (reviewCount < 200 && rating >= 4.5) — that's now just one input to
 * scoring, not a gate, so a great match that happens to be a little more
 * popular can still win instead of being excluded outright.
 *
 * Also learns from what's been rejected: every "Not For Me" tap feeds
 * rejectedTagCounts/rejectedCategoryCounts (see buildContext), so a pattern
 * of passing on (say) nightlife spots actually steers future For You *and*
 * Surprise Me picks away from nightlife, not just away from that one place.
 *
 * Never repeats a spot it's already surprised this user with — every past
 * `surprise_me_requested` event (not just the current session's "Not For
 * Me" taps) is pulled from history and excluded, so a fresh pick tomorrow,
 * next week, or next month is still a new one, not the same place coming
 * back around. Only once that history has exhausted every real candidate
 * nearby does it fall back to allowing a repeat — better than showing
 * nothing once someone has genuinely seen everything in range.
 */
export async function getSurpriseMe(
  client: SupabaseClient,
  profile: Profile,
  excludeIds: string[] = []
): Promise<SurpriseMeResult | null> {
  const pastSurpriseIds = await getEventExperienceIds(client, profile.userId, "surprise_me_requested");
  const neverRepeatExcludes = [...new Set([...excludeIds, ...pastSurpriseIds])];

  let results = await getRecommendations(client, profile, {
    surfaceContext: "surprise_me",
    limit: 8,
    additionalExcludeIds: neverRepeatExcludes,
  });

  // History has covered every real candidate nearby — only now is a repeat
  // (of a past surprise, never of something dismissed earlier this same
  // session) allowed, better than a dead end once someone's seen it all.
  if (results.length === 0) {
    results = await getRecommendations(client, profile, {
      surfaceContext: "surprise_me",
      limit: 8,
      additionalExcludeIds: excludeIds,
    });
  }

  if (results.length === 0) return null;

  const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))];
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

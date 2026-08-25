import type { Experience, Profile } from "@/types/database";
import { distanceMiles } from "@/lib/utils/geo";

const BUDGET_RANK: Record<string, number> = { free: 0, low: 1, medium: 2, high: 3, luxury: 4 };

export interface ScoredExperience {
  experience: Experience;
  score: number; // 0-100
  reasons: string[];
}

/**
 * Deterministic, explainable scoring — the "structured filtering + scoring"
 * half of the hybrid recommendation system. This alone is enough to power
 * the product; the AI layer (services/recommendation/engine.ts) adds
 * natural-language reasoning and can nudge scores, but everything here
 * still runs first and works with zero AI configured.
 */
export function scoreExperience(
  experience: Experience,
  profile: Profile,
  opts: { seenIds?: Set<string>; dismissedIds?: Set<string>; savedTagCounts?: Record<string, number> } = {}
): ScoredExperience {
  let score = 32; // baseline
  const reasons: string[] = [];

  // Interest overlap — the strongest signal.
  const overlap = experience.tags.filter((t) => profile.interests.includes(t));
  if (overlap.length > 0) {
    score += Math.min(overlap.length * 12, 30);
    reasons.push(`Matches your interests: ${overlap.join(", ")}`);
  }

  // Learned affinity from saved experiences' tags.
  if (opts.savedTagCounts) {
    const affinity = experience.tags.reduce((sum, t) => sum + (opts.savedTagCounts?.[t] ?? 0), 0);
    if (affinity > 0) {
      score += Math.min(affinity * 3, 15);
      reasons.push("Similar to experiences you've saved");
    }
  }

  // Budget alignment with personality slider + explicit preference.
  const preferredBudget = profile.preferences.budgetLevel;
  const budgetDelta = Math.abs(BUDGET_RANK[experience.priceLevel] - BUDGET_RANK[preferredBudget]);
  score += Math.max(0, 10 - budgetDelta * 4);
  if (budgetDelta === 0) reasons.push("Fits your usual budget");

  // Indoor/outdoor + social mode alignment.
  if (profile.preferences.indoorOutdoor !== "either" && experience.indoorOutdoor === profile.preferences.indoorOutdoor) {
    score += 6;
  }
  if (
    profile.preferences.socialMode !== "either" &&
    (experience.socialMode === profile.preferences.socialMode || experience.socialMode === "either")
  ) {
    score += 4;
  }

  // Distance decay.
  if (profile.latitude != null && profile.longitude != null) {
    const d = distanceMiles(profile.latitude, profile.longitude, experience.latitude, experience.longitude);
    const maxDistance = profile.preferences.maxDistanceMiles || 25;
    if (d <= maxDistance) {
      score += Math.max(0, 10 - (d / maxDistance) * 10);
      if (d < 5) reasons.push("Close to you");
    } else {
      score -= Math.min(20, (d - maxDistance) / 5);
    }
  }

  // Personality: adventurous <-> comfortable maps to hidden gems / adventure category.
  const adventurous = profile.personality.adventurousVsComfortable;
  if (experience.isHiddenGem && adventurous > 55) {
    score += 8;
    reasons.push("You lean adventurous — this is a hidden gem");
  }
  if (experience.category === "outdoor_adventure" && adventurous > 60) {
    score += 5;
  }

  // Novelty: familiar <-> novel slider, penalize anything already seen/dismissed.
  const novelty = profile.personality.familiarVsNovel;
  if (opts.dismissedIds?.has(experience.id)) score -= 40;
  if (opts.seenIds?.has(experience.id)) score -= 8;
  if (novelty > 60 && experience.isHiddenGem) score += 6;

  // Featured/quality nudge.
  if (experience.isFeatured) score += 3;
  if (experience.rating && experience.rating >= 4.7) score += 4;

  return {
    experience,
    // Capped at 98, not 100 — a "perfect" match reads as an algorithm that
    // isn't actually discriminating between experiences.
    score: Math.max(0, Math.min(98, Math.round(score))),
    reasons: reasons.length > 0 ? reasons : ["Popular with people who share your interests"],
  };
}

export function rankExperiences(
  experiences: Experience[],
  profile: Profile,
  opts?: Parameters<typeof scoreExperience>[2]
): ScoredExperience[] {
  return experiences
    .map((e) => scoreExperience(e, profile, opts))
    .sort((a, b) => b.score - a.score);
}

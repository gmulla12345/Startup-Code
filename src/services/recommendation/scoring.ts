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
  opts: {
    seenIds?: Set<string>;
    dismissedIds?: Set<string>;
    savedTagCounts?: Record<string, number>;
    savedCategoryCounts?: Record<string, number>;
    rejectedTagCounts?: Record<string, number>;
    rejectedCategoryCounts?: Record<string, number>;
    /** Surprise Me / Hidden Gems: blend in a continuous novelty bonus instead
     * of the hard "isHiddenGem" gate those surfaces used to filter candidates
     * down to — a well-matched, less-famous place should be able to compete
     * on its merits rather than needing to clear a fixed rating/review-count
     * cutoff. See getSurpriseMe() in engine.ts. */
    noveltyBias?: boolean;
  } = {}
): ScoredExperience {
  let score = 32; // baseline
  const reasons: string[] = [];

  // Interest overlap — the strongest signal.
  const overlap = experience.tags.filter((t) => profile.interests.includes(t));
  if (overlap.length > 0) {
    score += Math.min(overlap.length * 12, 30);
    reasons.push(`Matches your interests: ${overlap.join(", ")}`);
  }

  // Learned affinity from saved experiences' tags/category — positive
  // signal from what they've actually kept, not just their stated
  // interests. (opts.savedTagCounts is keyed by Experience.tags, which
  // are denormalized onto saved_experiences at save time — see
  // lib/repositories/saved.ts.)
  if (opts.savedTagCounts) {
    const affinity = experience.tags.reduce((sum, t) => sum + (opts.savedTagCounts?.[t] ?? 0), 0);
    if (affinity > 0) {
      score += Math.min(affinity * 3, 15);
      reasons.push("Similar to experiences you've saved");
    }
  }
  if (opts.savedCategoryCounts?.[experience.category]) {
    score += Math.min(opts.savedCategoryCounts[experience.category] * 2, 8);
  }

  // Learned negative affinity from what they've actively rejected — tapped
  // "Not For Me" on a Surprise Me pick, or dismissed a recommendation.
  // Symmetric to the saved-tag affinity above but pushing the other way, so
  // repeatedly passing on (say) nightlife spots actually teaches the system
  // to stop leading with nightlife, not just to avoid that one exact place
  // again (opts.dismissedIds, below, already handled that narrower case).
  if (opts.rejectedTagCounts) {
    const rejection = experience.tags.reduce((sum, t) => sum + (opts.rejectedTagCounts?.[t] ?? 0), 0);
    if (rejection > 0) score -= Math.min(rejection * 4, 25);
  }
  if (opts.rejectedCategoryCounts?.[experience.category]) {
    score -= Math.min(opts.rejectedCategoryCounts[experience.category] * 3, 15);
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

  // Surprise Me / Hidden Gems novelty bonus — continuous, not a pass/fail
  // review-count-and-rating gate. A place doesn't need >=4.5 stars and
  // under 200 reviews to be worth surprising someone with; it just needs to
  // be less obvious than the mainstream top pick, and it can still lose out
  // to a place that matches interests/learned taste better. Rating still
  // matters (a low-rated place shouldn't get a novelty boost just for being
  // obscure) but it's one input, not a gate.
  if (opts.noveltyBias) {
    const reviewCount = experience.reviewCount ?? 0;
    const rating = experience.rating ?? 4.0;
    const lowVisibilityBonus = Math.max(0, 12 - Math.log10(reviewCount + 10) * 5);
    const ratingFactor = Math.max(0, Math.min(1, (rating - 3.5) / 1.2));
    score += lowVisibilityBonus * ratingFactor;
    if (experience.isHiddenGem) score += 4;
    if (reviewCount > 3000) score -= 5; // gentle damper on the most mainstream megastars, not exclusionary
  }

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

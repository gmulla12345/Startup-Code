import type { Experience, Profile } from "@/types/database";
import type { RecommendationContext, WeekendPlan, WeekendPlanRequest } from "@/types/ai";
import type { ScoredExperience } from "@/services/recommendation/scoring";
import { rankExperiences } from "@/services/recommendation/scoring";
import { generateAIRecommendations } from "@/ai/recommend";
import { generateWeekendPlan } from "@/ai/weekend-plan";
import { formatCategoryLabel } from "@/lib/utils/format";

/**
 * Generates the "real example output" shown on /students.
 *
 * It runs the REAL pipeline, not a mock-up: the same deterministic scoring and
 * the same Claude-backed reasoning that Surprise Me uses, and the same Weekend
 * Planner prompt and validation, so what the page shows is what the product
 * writes. Only the inputs are example inputs: a made-up student profile and a
 * small set of archetype places ("Open-mic night at a neighborhood café"),
 * deliberately campus-neutral (the page serves every school) and deliberately
 * not named businesses or Google data (nothing here is Places content, and no
 * prices, ratings or hours are invented: the archetypes carry none).
 *
 * Run `npm run students-preview` to regenerate src/lib/content/students-preview.json.
 * It is not run at request time: the page serves a stored result, so it costs
 * nothing to view.
 */

export interface StudentsPreview {
  generatedAt: string;
  model: string;
  surpriseMe: { title: string; category: string; reasoning: string };
  weekend: {
    summary: string;
    days: { day: string; items: { time: string; title: string; note: string }[] }[];
  };
}

/** A made-up student. Nobody real; used only to feed the real pipeline. */
export const EXAMPLE_PROFILE: Profile = {
  id: "example-profile",
  userId: "example-user",
  firstName: "",
  lastName: null,
  ageRange: "18-20",
  city: null,
  region: null,
  country: null,
  latitude: null,
  longitude: null,
  avatarUrl: null,
  bio: null,
  interests: ["music", "food", "art", "outdoors"],
  lifestyleGoals: ["meet_people", "try_new_things"],
  personality: {
    spontaneousVsPlanned: 60,
    quietVsSocial: 55,
    adventurousVsComfortable: 60,
    budgetVsLuxury: 30,
    familiarVsNovel: 60,
  },
  preferences: {
    budgetLevel: "low",
    travelFrequency: "sometimes",
    maxDistanceMiles: 10,
    preferredDurationMinutes: 120,
    indoorOutdoor: "either",
    socialMode: "either",
    timeOfDay: "any",
  },
  onboardingCompleted: true,
  onboardingStep: 5,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

type Archetype = Pick<Experience, "title" | "category" | "tags" | "priceLevel" | "indoorOutdoor" | "bestTimeOfDay"> &
  Partial<Pick<Experience, "durationMinutes" | "isHiddenGem" | "socialMode">>;

const ARCHETYPES: Archetype[] = [
  { title: "Open-mic night at a neighborhood café", category: "music_entertainment", tags: ["music", "art"], priceLevel: "free", indoorOutdoor: "indoor", bestTimeOfDay: "evening", durationMinutes: 120 },
  { title: "Sunrise run along the water", category: "sports_fitness", tags: ["fitness", "outdoors"], priceLevel: "free", indoorOutdoor: "outdoor", bestTimeOfDay: "morning", durationMinutes: 60 },
  { title: "Saturday farmers' market", category: "food_drink", tags: ["food", "outdoors"], priceLevel: "low", indoorOutdoor: "outdoor", bestTimeOfDay: "morning", durationMinutes: 90 },
  { title: "A gallery opening, free to enter", category: "arts_culture", tags: ["art", "culture"], priceLevel: "free", indoorOutdoor: "indoor", bestTimeOfDay: "evening", durationMinutes: 90 },
  { title: "Late-night pancake house", category: "food_drink", tags: ["food", "nightlife"], priceLevel: "low", indoorOutdoor: "indoor", bestTimeOfDay: "night", durationMinutes: 60 },
  { title: "Used bookstore with a reading nook", category: "history_learning", tags: ["learning", "art"], priceLevel: "low", indoorOutdoor: "indoor", bestTimeOfDay: "afternoon", durationMinutes: 60 },
  { title: "Free concert on the lawn", category: "music_entertainment", tags: ["music", "concerts", "outdoors"], priceLevel: "free", indoorOutdoor: "outdoor", bestTimeOfDay: "evening", durationMinutes: 120 },
  { title: "Climbing gym day pass", category: "sports_fitness", tags: ["fitness", "adventure"], priceLevel: "medium", indoorOutdoor: "indoor", bestTimeOfDay: "afternoon", durationMinutes: 120 },
  { title: "Dollar-movie night at a restored theater", category: "music_entertainment", tags: ["art", "culture"], priceLevel: "low", indoorOutdoor: "indoor", bestTimeOfDay: "evening", durationMinutes: 150 },
  { title: "Thrift and vintage shops, a short walk apart", category: "hidden_gem", tags: ["art"], priceLevel: "low", indoorOutdoor: "either", bestTimeOfDay: "afternoon", durationMinutes: 120, isHiddenGem: true },
  { title: "Pickup basketball at the outdoor courts", category: "sports_fitness", tags: ["sports", "fitness"], priceLevel: "free", indoorOutdoor: "outdoor", bestTimeOfDay: "afternoon", durationMinutes: 90 },
  { title: "Sunset from a quiet overlook", category: "outdoor_adventure", tags: ["outdoors", "nature", "photography"], priceLevel: "free", indoorOutdoor: "outdoor", bestTimeOfDay: "evening", durationMinutes: 60, isHiddenGem: true },
  { title: "Coffee and a long conversation at a corner café", category: "food_drink", tags: ["food"], priceLevel: "low", indoorOutdoor: "indoor", bestTimeOfDay: "afternoon", durationMinutes: 90 },
];

/**
 * Archetype places as Experience objects. No price, rating, review count, hours,
 * address, or coordinates is set: none exists, and none is invented.
 */
export const EXAMPLE_CANDIDATES: Experience[] = ARCHETYPES.map((a, i) => ({
  id: `example-${i + 1}`,
  slug: `example-${i + 1}`,
  title: a.title,
  description: a.title,
  shortDescription: a.title,
  category: a.category,
  specificType: null,
  tags: a.tags,
  images: [],
  city: "",
  region: null,
  country: "",
  address: null,
  latitude: 0,
  longitude: 0,
  priceLevel: a.priceLevel,
  priceEstimate: null,
  priceCurrency: "USD",
  durationMinutes: a.durationMinutes ?? null,
  indoorOutdoor: a.indoorOutdoor,
  socialMode: a.socialMode ?? "either",
  bestTimeOfDay: a.bestTimeOfDay,
  rating: null,
  reviewCount: 0,
  isHiddenGem: a.isHiddenGem ?? false,
  isFeatured: false,
  isPremium: false,
  externalBookingUrl: null,
  sourceProvider: "manual",
  sourceId: null,
  requirements: [],
  availability: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

const WEEKEND_REQUEST: WeekendPlanRequest = {
  budgetLevel: "low",
  days: ["saturday", "sunday"],
  socialMode: "group",
  energyLevel: "medium",
  interests: [],
};

/** The planner's non-AI fallback summary (see fallbackPlan in ai/weekend-plan.ts). */
const WEEKEND_FALLBACK_SUMMARY = "A flexible plan built from your top-matched experiences.";

export interface PreviewDeps {
  recommend: (candidates: ScoredExperience[], context: RecommendationContext) => ReturnType<typeof generateAIRecommendations>;
  planWeekend: (profile: Profile, request: WeekendPlanRequest, candidates: Experience[]) => Promise<WeekendPlan>;
  now: () => Date;
  model: string;
}

/**
 * Throws if either half fell back to its non-AI version: this page promises
 * real output, so a quiet fallback must fail loudly, not ship.
 */
export async function generateStudentsPreview(deps: PreviewDeps): Promise<StudentsPreview> {
  const now = deps.now();

  // Surprise Me: score the candidates the way the product does (with the novelty
  // bias Surprise Me uses), let the model explain the top ones, take the first.
  const ranked = rankExperiences(EXAMPLE_CANDIDATES, EXAMPLE_PROFILE, { noveltyBias: true }).slice(0, 6);
  const recommendations = await deps.recommend(ranked, {
    profile: EXAMPLE_PROFILE,
    location: null,
    now: now.toISOString(),
    weather: null,
    budgetOverride: null,
    travelStatus: { isTraveling: false, destinationCity: null },
    recentEvents: [],
    excludeExperienceIds: [],
  });
  const pick = recommendations[0];
  const picked = ranked.find((r) => r.experience.id === pick?.experienceId);
  if (!pick || !picked) throw new Error("Surprise Me produced no pick.");
  if (pick.reasoning === picked.reasons.join(". ")) {
    throw new Error("Surprise Me fell back to its non-AI reasoning. Is ANTHROPIC_API_KEY set and working?");
  }

  // Weekend Planner: the real prompt, validation and attach step.
  const plan = await deps.planWeekend(EXAMPLE_PROFILE, WEEKEND_REQUEST, EXAMPLE_CANDIDATES);
  if (plan.summary === WEEKEND_FALLBACK_SUMMARY) {
    throw new Error("The Weekend Planner fell back to its non-AI plan. Is ANTHROPIC_API_KEY set and working?");
  }

  const days = WEEKEND_REQUEST.days.map((day) => ({
    day,
    items: plan.items
      .filter((item) => item.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((item) => ({ time: item.startTime, title: item.title, note: item.notes })),
  }));
  if (days.every((d) => d.items.length === 0)) throw new Error("The Weekend Planner returned no items.");

  return {
    generatedAt: now.toISOString(),
    model: deps.model,
    surpriseMe: {
      title: picked.experience.title,
      category: formatCategoryLabel(picked.experience.category),
      reasoning: pick.reasoning,
    },
    weekend: { summary: plan.summary, days: days.filter((d) => d.items.length > 0) },
  };
}

export const realDeps = (model: string): PreviewDeps => ({
  recommend: (candidates, context) => generateAIRecommendations(candidates, context),
  planWeekend: (profile, request, candidates) => generateWeekendPlan(profile, request, candidates),
  now: () => new Date(),
  model,
});

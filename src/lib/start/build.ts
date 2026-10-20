import { FIRST_LIST_PLACES, FIRST_LIST_RADIUS_MILES } from "@/lib/config/start";
import { LIST_MIN_PLACES } from "@/lib/config/lists";
import { whyThisPick } from "@/lib/lists/reasons";
import { getLocalPickIds, isMarked } from "@/lib/local-picks";
import { placeIdFromExperienceId } from "@/lib/share/input";
import { defaultPreferences, emptyPersonality } from "@/lib/repositories/profile";
import { usageContext } from "@/lib/usage/context";
import { distanceMiles } from "@/lib/utils/geo";
import { getExperienceProvider } from "@/services/providers";
import { rankExperiences } from "@/services/recommendation/scoring";
import type { Experience, Profile } from "@/types/database";
import { outingInterests, type BudgetId, type OutingId } from "./questions";
import type { FirstList, StartPlace } from "./types";

/**
 * Making the first list. The visitor has no account, so the profile the scoring runs
 * on is made up from the two answers and nothing else: no name, no history, no saved
 * places. Everything else is the same code the signed-in app uses to rank places.
 */

// COPY: the title and line of copy on a first list
const TITLE = "Your first list";
const BLURB = "Chosen from what you told us.";

/** A profile that holds only what the visitor said, and neutral defaults for the rest. */
export function firstListProfile(
  outing: OutingId,
  budget: BudgetId,
  where?: { latitude: number; longitude: number }
): Profile {
  const now = new Date(0).toISOString();
  return {
    id: "first-list",
    userId: "first-list",
    firstName: "",
    lastName: null,
    ageRange: null,
    city: null,
    region: null,
    country: null,
    latitude: where?.latitude ?? null,
    longitude: where?.longitude ?? null,
    avatarUrl: null,
    bio: null,
    interests: outingInterests(outing),
    lifestyleGoals: [],
    personality: emptyPersonality(),
    preferences: { ...defaultPreferences(), budgetLevel: budget, maxDistanceMiles: FIRST_LIST_RADIUS_MILES / 2 },
    onboardingCompleted: true,
    onboardingStep: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/** Only what a row needs, so nothing else of a place leaves the server for a visitor's browser. */
export function toStartPlace(experience: Experience, profile: Profile): StartPlace {
  const miles =
    profile.latitude != null && profile.longitude != null
      ? distanceMiles(profile.latitude, profile.longitude, experience.latitude, experience.longitude)
      : null;
  return {
    id: experience.id,
    slug: experience.slug,
    title: experience.title,
    category: experience.category,
    tags: experience.tags,
    images: experience.images.slice(0, 1),
    city: experience.city,
    priceLevel: experience.priceLevel,
    priceEstimate: experience.priceEstimate,
    isHiddenGem: experience.isHiddenGem,
    distanceMiles: miles,
    why: whyThisPick(experience, profile),
  };
}

/** Marks the places the owner has set as local picks, from one read. Nothing else about a place changes. */
async function withLocalPicks(places: StartPlace[]): Promise<StartPlace[]> {
  const marked = await getLocalPickIds(places.map((p) => placeIdFromExperienceId(p.id)));
  return marked.size === 0 ? places : places.map((p) => ({ ...p, localPick: isMarked(p.id, marked) }));
}

/**
 * The first list for someone at these coordinates: the best matches among the places
 * around them. Null when there are not enough places to make a list (Google could not
 * be asked, or there is little nearby), never padded.
 */
export async function buildFirstList(input: {
  outing: OutingId;
  budget: BudgetId;
  latitude: number;
  longitude: number;
}): Promise<FirstList | null> {
  const profile = firstListProfile(input.outing, input.budget, input);
  // Counted against its own daily ceiling for visitors with no account (config/usage.ts).
  const provider = await getExperienceProvider(usageContext(null, "start_list"));
  const candidates = await provider.list({
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMiles: FIRST_LIST_RADIUS_MILES,
    limit: 60,
  });

  const top = rankExperiences(candidates, profile).slice(0, FIRST_LIST_PLACES);
  if (top.length < LIST_MIN_PLACES) return null;
  return { title: TITLE, blurb: BLURB, places: await withLocalPicks(top.map((r) => toStartPlace(r.experience, profile))) };
}

/**
 * The same list again from the ids a browser kept: each place is asked for again (the
 * details are Google's and were not kept), in the order they were given. Places that
 * cannot be found any more are left out; null if too few remain.
 */
export async function restoreFirstList(input: { outing: OutingId; budget: BudgetId; ids: string[] }): Promise<FirstList | null> {
  const profile = firstListProfile(input.outing, input.budget);
  const provider = await getExperienceProvider(usageContext(null, "start_list"));
  const found = await Promise.all(input.ids.map((id) => provider.getById(id).catch(() => null)));
  const places = found.filter((e): e is Experience => Boolean(e)).map((e) => toStartPlace(e, profile));
  if (places.length < LIST_MIN_PLACES) return null;
  return { title: TITLE, blurb: BLURB, places: await withLocalPicks(places) };
}

import { HOME_LIST_PLACES, LIST_MAX_PLACES, LIST_MIN_PLACES } from "@/lib/config/lists";
import { placeIdFromExperienceId } from "@/lib/share/input";
import { distanceMiles } from "@/lib/utils/geo";
import type { Experience, Profile } from "@/types/database";
import { whyThisPick } from "./reasons";
import { LIST_TEMPLATES, type ListTemplateId, type PoolItem } from "./templates";

export interface ListPlace extends PoolItem {
  /** The line under the place: why it is here. Null when we hold no fact worth saying. */
  why: string | null;
}

export interface HomeList {
  template: ListTemplateId;
  title: string;
  blurb: string;
  places: ListPlace[];
  /**
   * The Google place ids of the places shown, in order, when the list can be turned
   * into a public link (every shown place is a Google place and there are at least
   * LIST_MIN_PLACES of them). Empty when it cannot.
   */
  shareIds: string[];
}

export interface RecommendedPlace {
  experience: Experience;
  matchScore: number;
}

/**
 * Turns one set of ranked recommendations into the lists shown on Home. No new
 * request is made: every list is a rule over the same places the person would have
 * seen in the rails before, so the cost is unchanged. A list with fewer than
 * LIST_MIN_PLACES is left out rather than padded.
 */
export function buildHomeLists(
  recommendations: readonly RecommendedPlace[],
  profile: Pick<Profile, "interests" | "latitude" | "longitude">
): HomeList[] {
  const seen = new Set<string>();
  const pool: PoolItem[] = [];
  for (const r of recommendations) {
    if (seen.has(r.experience.id)) continue;
    seen.add(r.experience.id);
    pool.push({
      experience: r.experience,
      matchScore: r.matchScore,
      distanceMiles:
        profile.latitude != null && profile.longitude != null
          ? distanceMiles(profile.latitude, profile.longitude, r.experience.latitude, r.experience.longitude)
          : null,
    });
  }

  const lists: HomeList[] = [];
  for (const template of LIST_TEMPLATES) {
    const chosen = template.select(pool).slice(0, Math.min(HOME_LIST_PLACES, LIST_MAX_PLACES));
    if (chosen.length < LIST_MIN_PLACES) continue;

    const ids = chosen.map((p) => placeIdFromExperienceId(p.experience.id));
    const shareable = ids.length >= LIST_MIN_PLACES && ids.every((id): id is string => id != null);

    lists.push({
      template: template.id,
      title: template.title,
      blurb: template.blurb,
      places: chosen.map((p) => ({ ...p, why: whyThisPick(p.experience, profile) })),
      shareIds: shareable ? (ids as string[]) : [],
    });
  }
  return lists;
}

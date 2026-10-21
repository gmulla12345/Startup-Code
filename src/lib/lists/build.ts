import { HOME_LIST_PLACES, LIST_MAX_PLACES, LIST_MIN_PLACES } from "@/lib/config/lists";
import { placeIdFromExperienceId } from "@/lib/share/input";
import { distanceMiles } from "@/lib/utils/geo";
import type { Experience, Profile } from "@/types/database";
import { whyThisPick } from "./reasons";
import { LIST_TEMPLATES, type ListTemplateId, type PoolItem } from "./templates";

export interface ListPlace extends PoolItem {
  /** The line under the place: why it is here. Null when we hold no fact worth saying. */
  why: string | null;
  /** The owner has marked this place as a local pick (see lib/local-picks). Set after the list is built; never computed. */
  localPick?: boolean;
  /** How many verified students nearby saved this place this week, when enough did (the owner's minimum). Never estimated. */
  savedBy?: number;
}

export interface HomeList {
  /** Unique among the lists on a screen: the template's id, or "house-" and the token of a list we wrote. */
  key: string;
  /** Which rule made it, or "house" for a list we wrote ourselves (see lists/house.ts). */
  template: ListTemplateId | "house";
  /** The quiet line under the copy of a list that ends ("Through Sunday"). */
  through?: string | null;
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
      key: template.id,
      template: template.id,
      title: template.title,
      blurb: template.blurb,
      // The fact that put each place on THIS list leads its line, so a place always says why it is where it is.
      places: chosen.map((p) => ({ ...p, why: whyThisPick(p.experience, profile, { list: template.id, distanceMiles: p.distanceMiles }) })),
      shareIds: shareable ? (ids as string[]) : [],
    });
  }
  return lists;
}

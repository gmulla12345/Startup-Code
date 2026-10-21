import { createAdminClient } from "@/lib/supabase/admin";
import { placeIdFromExperienceId } from "@/lib/share/input";
import {
  SAVE_COUNT_FLOOR,
  SAVE_COUNT_MAX_PLACES,
  SAVE_COUNT_MIN_KEY,
  SAVE_COUNT_RADIUS_MILES,
  SAVE_COUNT_WINDOW_DAYS,
} from "@/lib/config/save-counts";

export { saveCountLine } from "@/lib/config/save-counts";

/**
 * "Saved by N students nearby this week", from real saves and nothing else. The owner's minimum is read from app_config;
 * with none set, nothing here asks the database for a count and no number exists to show. A count below the minimum is
 * never in the answer, so a page cannot show it by mistake. The viewer must have a location on their profile (the count is
 * "nearby" them); a visitor with no account, or a person with no location, gets none.
 *
 * Asking never stops a page: any failure means no numbers.
 */

/** The minimum as the owner may have typed it (a number, or digits in text), raised to the floor; null when it is not a whole number. */
export function parseMinimum(raw: unknown): number | null {
  let n: number | null = null;
  if (typeof raw === "number" && Number.isInteger(raw)) n = raw;
  else if (typeof raw === "string" && /^\d{1,7}$/.test(raw.trim())) n = Number(raw.trim());
  if (n === null || n < 1 || n > 1_000_000) return null;
  return Math.max(SAVE_COUNT_FLOOR, n);
}

/** The owner's minimum, or null when it is not set (counts are off) or cannot be read. */
export async function getSaveCountMinimum(): Promise<number | null> {
  try {
    const { data, error } = await createAdminClient().from("app_config").select("value").eq("key", SAVE_COUNT_MIN_KEY).maybeSingle();
    if (error) {
      console.error("[save-counts] could not read the minimum:", error.message);
      return null;
    }
    return parseMinimum(data?.value);
  } catch (error) {
    console.error("[save-counts] could not read the minimum:", error);
    return null;
  }
}

export interface CountViewer {
  userId: string;
  latitude: number | null;
  longitude: number | null;
}

/** For each place (by experience id) whose count reaches the owner's minimum, how many nearby students saved it this week. */
export async function getSaveCounts(
  experienceIds: readonly (string | null | undefined)[],
  viewer: CountViewer | null,
  now: Date = new Date()
): Promise<Map<string, number>> {
  const none = new Map<string, number>();
  if (!viewer || viewer.latitude == null || viewer.longitude == null) return none;
  // Only Google places carry saves we can name by id; anything else is not asked about.
  const ids = [...new Set(experienceIds.filter((id): id is string => typeof id === "string" && placeIdFromExperienceId(id) !== null))].slice(0, SAVE_COUNT_MAX_PLACES);
  if (ids.length === 0) return none;

  const minimum = await getSaveCountMinimum();
  if (minimum === null) return none;

  try {
    const since = new Date(now.getTime() - SAVE_COUNT_WINDOW_DAYS * 86_400_000).toISOString();
    const { data, error } = await createAdminClient().rpc("place_save_counts", {
      p_experience_ids: ids,
      p_lat: viewer.latitude,
      p_lng: viewer.longitude,
      p_radius_miles: SAVE_COUNT_RADIUS_MILES,
      p_since: since,
      p_viewer: viewer.userId,
      p_min: minimum,
    });
    if (error) {
      console.error("[save-counts] could not read the counts:", error.message);
      return none;
    }
    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { out_experience_id: string; out_savers: number }[]) {
      // Defence in depth: the database already leaves out anything below the minimum, and so does this.
      if (typeof row.out_savers === "number" && row.out_savers >= minimum) counts.set(row.out_experience_id, row.out_savers);
    }
    return counts;
  } catch (error) {
    console.error("[save-counts] could not read the counts:", error);
    return none;
  }
}

/** Sets savedBy on each place of a set of lists that enough nearby students have saved, from one read. Nothing else changes. */
export async function markSaveCounts<T extends { places: { experience: { id: string }; savedBy?: number }[] }>(
  lists: readonly T[],
  viewer: CountViewer | null
): Promise<T[]> {
  const counts = await getSaveCounts(lists.flatMap((l) => l.places.map((p) => p.experience.id)), viewer);
  if (counts.size === 0) return [...lists];
  return lists.map((l) => ({
    ...l,
    places: l.places.map((p) => {
      const n = counts.get(p.experience.id);
      return n === undefined ? p : { ...p, savedBy: n };
    }),
  }));
}

import { createAdminClient } from "@/lib/supabase/admin";
import { placeIdFromExperienceId } from "@/lib/share/input";
export { LOCAL_PICK_LABEL } from "@/lib/config/local-picks";

/**
 * The "Local pick" badge. The owner marks a place by hand in the local_picks table (one row, local_pick true); nothing
 * infers it, counts it or scores it, so it is shown only where the owner said so. The table holds the Google place id
 * and nothing else from Google. It is closed to every browser key: the server asks here, with the service role, and a
 * page shows only the yes or no.
 *
 * Asking never stops a page: if the table cannot be read (or has not been created yet), nothing is marked and the page
 * is drawn without badges.
 */

/** The most place ids asked about in one call: a list is ten places, a page a few lists. */
const MAX_IDS = 200;
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

/** Which of these Google place ids the owner has marked. Unknown, malformed and curated ids are simply not marked. */
export async function getLocalPickIds(placeIds: readonly (string | null | undefined)[]): Promise<Set<string>> {
  const ids = [...new Set(placeIds.filter((id): id is string => typeof id === "string" && PLACE_ID.test(id)))].slice(0, MAX_IDS);
  if (ids.length === 0) return new Set();
  try {
    const { data, error } = await createAdminClient().from("local_picks").select("place_id").eq("local_pick", true).in("place_id", ids);
    if (error) {
      console.error("[local-picks] could not read the marked places:", error.message);
      return new Set();
    }
    return new Set((data ?? []).map((row) => row.place_id as string));
  } catch (error) {
    console.error("[local-picks] could not read the marked places:", error);
    return new Set();
  }
}

/** Whether an experience id ("g-<place id>") is one of the marked places. Curated experiences are never marked. */
export function isMarked(experienceId: string, marked: ReadonlySet<string>): boolean {
  const placeId = placeIdFromExperienceId(experienceId);
  return placeId != null && marked.has(placeId);
}

/** Marks each place of a set of lists, from one read for the whole set. Nothing else about a list changes. */
export async function markLocalPicks<T extends { places: { experience: { id: string }; localPick?: boolean }[] }>(lists: readonly T[]): Promise<T[]> {
  const marked = await getLocalPickIds(lists.flatMap((l) => l.places.map((p) => placeIdFromExperienceId(p.experience.id))));
  if (marked.size === 0) return [...lists];
  return lists.map((l) => ({ ...l, places: l.places.map((p) => ({ ...p, localPick: isMarked(p.experience.id, marked) })) }));
}

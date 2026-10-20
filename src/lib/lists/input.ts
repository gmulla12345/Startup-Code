import { LIST_MAX_PLACES, LIST_MIN_PLACES } from "@/lib/config/lists";

/** The shape of a Google place id: the only Google value a list keeps. */
const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

export type PlaceIdsResult = { ok: true; ids: string[] } | { ok: false; error: string };

/**
 * The place ids a person asks to put in a list: three to ten, each in Google's shape,
 * none twice. Anything else is refused with a plain sentence. (The database checks the
 * same rules; this gives a kind answer before it gets there.)
 */
export function cleanPlaceIds(raw: unknown): PlaceIdsResult {
  if (!Array.isArray(raw)) return { ok: false, error: "A list needs places." };
  if (raw.length < LIST_MIN_PLACES || raw.length > LIST_MAX_PLACES) {
    return { ok: false, error: `A list holds ${LIST_MIN_PLACES} to ${LIST_MAX_PLACES} places.` };
  }
  const ids: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string" || !PLACE_ID.test(value)) return { ok: false, error: "One of those places cannot be shared as a list yet." };
    if (ids.includes(value)) return { ok: false, error: "A list cannot hold a place twice." };
    ids.push(value);
  }
  return { ok: true, ids };
}

import { CATEGORY_LABELS } from "@/lib/config/categories";
import { INTERESTS } from "@/lib/config/taxonomy";
import { LIST_MAX_PLACES } from "@/lib/config/lists";

/**
 * One place in a first list, as it is kept: its id, and the tags and category our own
 * code derived for it (the same three things saving a place stores). No name, photo,
 * rating, address or price: those are Google's, fetched again whenever they are shown.
 * Shared by the browser's storage and the server's "keep it" route, so both refuse
 * the same things.
 */
export interface FirstListPick {
  experienceId: string;
  tags: string[];
  category: string | null;
}

/** The shape of an experience id: "g-" and a Google place id, a curated uuid, or a slug. */
const EXPERIENCE_ID = /^[A-Za-z0-9_-]{3,320}$/;
const KNOWN_TAGS = new Set<string>(INTERESTS.map((i) => i.value));
const KNOWN_CATEGORIES = new Set<string>(Object.keys(CATEGORY_LABELS));

export function isExperienceId(value: unknown): value is string {
  return typeof value === "string" && EXPERIENCE_ID.test(value);
}

/**
 * The picks in `raw`, or null if it is not a clean list of 3 to 10 distinct places.
 * Unknown tags and categories are refused, not trimmed: whatever wrote them was wrong.
 */
export function cleanPicks(raw: unknown): FirstListPick[] | null {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > LIST_MAX_PLACES) return null;
  const picks: FirstListPick[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const { experienceId, tags, category } = item as Record<string, unknown>;
    if (!isExperienceId(experienceId) || seen.has(experienceId)) return null;
    if (!Array.isArray(tags) || tags.length > 30 || !tags.every((t) => typeof t === "string" && KNOWN_TAGS.has(t))) return null;
    if (category !== null && !(typeof category === "string" && KNOWN_CATEGORIES.has(category))) return null;
    seen.add(experienceId);
    picks.push({ experienceId, tags: tags as string[], category: category as string | null });
  }
  return picks;
}

import { LIST_MAX_PLACES, LIST_MIN_PLACES, OWN_LIST_BLURB_MAX, OWN_LIST_TITLE_MAX } from "@/lib/config/lists";
import { hasLinkLike, placeIdFromExperienceId, stripUnwanted } from "@/lib/share/input";

/**
 * What a person types or sends when making a list of their own, checked before it is stored. Pure, so each rule is tested
 * on its own. Their words appear on a page with our name on it, so they are held to the same rule as a share note: one tidy
 * line, no control or direction characters, and no links.
 */

export type Cleaned<T> = { ok: true; value: T } | { ok: false; error: string };

function tidy(raw: string): string {
  return stripUnwanted(raw).replace(/\s+/g, " ").trim();
}

// COPY: what is said when a list's title or line of copy cannot be used
export function cleanTitle(raw: unknown): Cleaned<string> {
  if (typeof raw !== "string") return { ok: false, error: "Give the list a title." };
  const title = tidy(raw);
  if (title === "") return { ok: false, error: "Give the list a title." };
  if ([...title].length > OWN_LIST_TITLE_MAX) return { ok: false, error: `A title can be up to ${OWN_LIST_TITLE_MAX} characters.` };
  if (hasLinkLike(title)) return { ok: false, error: "A title cannot contain a link." };
  return { ok: true, value: title };
}

export function cleanBlurb(raw: unknown): Cleaned<string | null> {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "The line under the title is text." };
  const blurb = tidy(raw);
  if (blurb === "") return { ok: true, value: null };
  if ([...blurb].length > OWN_LIST_BLURB_MAX) return { ok: false, error: `The line under the title can be up to ${OWN_LIST_BLURB_MAX} characters.` };
  if (hasLinkLike(blurb)) return { ok: false, error: "The line under the title cannot contain a link." };
  return { ok: true, value: blurb };
}

/** The Google place ids behind a list of experience ids: three to ten, each once, each a real Google place. */
export function cleanOwnPlaceIds(experienceIds: unknown): Cleaned<string[]> {
  if (!Array.isArray(experienceIds)) return { ok: false, error: "A list holds three to ten places." };
  const placeIds: string[] = [];
  for (const id of experienceIds) {
    const placeId = placeIdFromExperienceId(id);
    if (!placeId) return { ok: false, error: "A list can hold only places you have saved from Google." };
    placeIds.push(placeId);
  }
  if (placeIds.length < LIST_MIN_PLACES || placeIds.length > LIST_MAX_PLACES) return { ok: false, error: "A list holds three to ten places." };
  if (new Set(placeIds).size !== placeIds.length) return { ok: false, error: "A place can be on a list once." };
  return { ok: true, value: placeIds };
}

export interface OwnListInput {
  title: string;
  blurb: string | null;
  placeIds: string[];
  /** Whether anyone with the link may open it. Private unless the person chose. */
  isPublic: boolean;
  /** Whether to show their first name on it. Only ever true on a public list. */
  showName: boolean;
}

export function cleanOwnList(body: { title: unknown; blurb?: unknown; experienceIds: unknown; isPublic?: unknown; showName?: unknown }): Cleaned<OwnListInput> {
  const title = cleanTitle(body.title);
  if (!title.ok) return title;
  const blurb = cleanBlurb(body.blurb);
  if (!blurb.ok) return blurb;
  const placeIds = cleanOwnPlaceIds(body.experienceIds);
  if (!placeIds.ok) return placeIds;
  const isPublic = body.isPublic === true;
  return { ok: true, value: { title: title.value, blurb: blurb.value, placeIds: placeIds.value, isPublic, showName: isPublic && body.showName === true } };
}

import { SHARE_NOTE_MAX } from "@/lib/config/share";
import { PLACE_ID_PREFIX } from "@/lib/google/place-id";

/**
 * Everything a person types or sends when sharing, checked before it is stored.
 * Pure, so each rule is tested on its own.
 */

// A link, in a note on a page with our name on it, is a way to lend our domain to
// someone else's message. Notes are for a few words about a place, so they cannot
// carry one: a scheme, "www.", or a bare address on a common ending.
const LINK_LIKE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|co|app|ly|me|us|edu|gov|info|biz|xyz|link|dev|ai|gg|tv|to)\b)/i;

/**
 * Replaces control characters and the invisible direction and joining marks (which
 * can make text read differently from how it is stored) with a space. Checked by
 * character code rather than a pattern, so the ranges are plain to read.
 */
export function stripUnwanted(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    const unwanted =
      c <= 0x1f || // control characters
      (c >= 0x7f && c <= 0x9f) || // delete and the C1 controls
      (c >= 0x200b && c <= 0x200f) || // zero-width spaces and direction marks
      (c >= 0x202a && c <= 0x202e) || // direction embeddings and overrides
      (c >= 0x2066 && c <= 0x2069) || // direction isolates
      c === 0xfeff; // byte order mark
    out += unwanted ? " " : ch;
  }
  return out;
}

/** Whether a line of text carries something that reads as a link (used for notes and for the titles of lists people write). */
export function hasLinkLike(text: string): boolean {
  return LINK_LIKE.test(text);
}

export type NoteResult = { ok: true; note: string | null } | { ok: false; error: string };

/** Collapses a note to one tidy line, and refuses one that is too long or carries a link. Empty is no note. */
export function cleanNote(raw: unknown): NoteResult {
  if (raw === undefined || raw === null) return { ok: true, note: null };
  if (typeof raw !== "string") return { ok: false, error: "A note is text." };

  const note = stripUnwanted(raw).replace(/\s+/g, " ").trim();
  if (note === "") return { ok: true, note: null };
  if ([...note].length > SHARE_NOTE_MAX) return { ok: false, error: `Notes can be up to ${SHARE_NOTE_MAX} characters.` };
  if (LINK_LIKE.test(note)) return { ok: false, error: "Notes cannot contain links." };
  return { ok: true, note };
}

const PLACE_ID = /^[A-Za-z0-9_-]{10,300}$/;

/**
 * The Google place_id inside an experience id ("g-" followed by the place_id), or
 * null for anything else: a curated experience, a malformed id, or something that
 * is not an id at all. place_id is the only Google value a share link stores.
 */
export function placeIdFromExperienceId(experienceId: unknown): string | null {
  if (typeof experienceId !== "string" || !experienceId.startsWith(PLACE_ID_PREFIX)) return null;
  const placeId = experienceId.slice(PLACE_ID_PREFIX.length);
  return PLACE_ID.test(placeId) ? placeId : null;
}

/** A first name, tidied for display: one line, no control characters, at most 30 characters. Empty is no name. */
export function cleanFirstName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = stripUnwanted(raw).replace(/\s+/g, " ").trim();
  if (name === "") return null;
  return [...name].slice(0, 30).join("");
}

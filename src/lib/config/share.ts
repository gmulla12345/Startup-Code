/**
 * Share links: the numbers and names in one place.
 *
 * A share link is a public, unguessable page for one place or one plan, made by
 * its owner and visible to anyone who has the address. The owner decides what is
 * on it (an optional note, and whether their first name appears) and can turn it
 * off, which deletes it.
 */

/** Where a share page lives. The token that follows is the only way to find it. */
export const SHARE_PATH = "/s";

/** The campaign label a "Plan your own" button carries, so signups can be traced to shared links. */
export const SHARE_SRC = { place: "share-place", plan: "share-plan" } as const;

/** The longest note a person can add. Short on purpose: a note, not a post. */
export const SHARE_NOTE_MAX = 140;

/** The most live links one account may have, so one account cannot spawn pages without limit. A starting value. */
export const MAX_ACTIVE_SHARE_LINKS = 100;

/**
 * How long a share page, and the Google details it shows, are reused before they
 * are fetched again. The page itself also states this as a literal
 * (`export const revalidate = 3600` in app/s/[token]/page.tsx, which Next requires
 * to be a literal); a test keeps the two equal. One hour is the same transient
 * cache the rest of the app uses for Place Details, and bounds a popular link to
 * about one Google call an hour however many people open it.
 */
export const SHARE_CACHE_SECONDS = 3600;

/** Creating or changing links, per account, so a script cannot churn them. */
export const SHARE_WRITE_LIMIT = { max: 20, windowMs: 10 * 60_000 } as const;

/** The most stops shown on a shared plan. A plan is a handful of places, not a database. */
export const SHARE_PLAN_MAX_ITEMS = 24;

export type ShareKind = "place" | "plan";

export function sharePath(token: string): string {
  return `${SHARE_PATH}/${token}`;
}

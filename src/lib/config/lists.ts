/**
 * Lists: the numbers and names in one place.
 *
 * A list is a title, one line of copy, and three to ten places. The ones on Home are
 * made for the person looking at them (from the same recommendations the rest of the
 * app uses, with no further Google or AI call). A person can turn one into a public
 * link; what that link stores is the list's template and the Google place ids, and
 * nothing else from Google, so every name, photo and address on the page is fetched
 * when the page is built (the same rule as share links).
 */

/** Where a shared list lives. The token that follows is the only way to find it. */
export const LIST_PATH = "/l";

/** The campaign label a "make your own" button carries, so signups can be traced to shared lists. */
export const LIST_SRC = "share-list";

/** A list has at least this many places, or it is not a list worth showing. */
export const LIST_MIN_PLACES = 3;

/** ...and at most this many. */
export const LIST_MAX_PLACES = 10;

/** How many places each list shows on Home. */
export const HOME_LIST_PLACES = 6;

/**
 * "Close by" lists only places within this many miles, nearest first. A starting
 * value: a person in a small town and a person in a big city may want different ones.
 */
export const CLOSE_BY_MILES = 5;

/** The most live list links one account may have, so one account cannot spawn pages without limit. A starting value. */
export const MAX_SHARED_LISTS = 50;

/**
 * How long a shared list page, and the Google details it shows, are reused before
 * they are fetched again. The page also states this as a literal (`export const
 * revalidate = 3600` in app/l/[token]/page.tsx, which Next requires to be a literal);
 * a test keeps the two equal. One hour is the same transient cache the rest of the
 * app uses for Place Details.
 */
export const LIST_CACHE_SECONDS = 3600;

/** Making or turning off list links, per account, so a script cannot churn them. */
export const LIST_WRITE_LIMIT = { max: 20, windowMs: 10 * 60_000 } as const;

/** The most lists we wrote ourselves ("this week's lists") shown on Home at once, newest first. A starting value. */
export const HOUSE_LISTS_ON_HOME = 2;

/**
 * The time zone in which a list's start and end dates are read: "Through Sunday" means through the end of Sunday here. A
 * starting value (the same zone the daily usage limits use): change it here.
 */
export const LIST_TIMEZONE = "America/New_York";

/**
 * Lists a person makes themselves. A title and a line of copy they write, and three to ten places from the ones they have
 * saved. Private unless they choose; a link anyone who has it can open (not listed, not indexed) if they do.
 */
export const OWN_LISTS_PATH = "/lists";
export const OWN_LIST_TITLE_MAX = 80;
export const OWN_LIST_BLURB_MAX = 160;
/** The most lists of their own one account may keep. A starting value. */
export const MAX_OWN_LISTS = 30;
/** The most saved places offered when choosing for a list (the newest). Each is a real-place lookup, so it is bounded. */
export const OWN_LIST_CHOICES = 60;

export function listPath(token: string): string {
  return `${LIST_PATH}/${token}`;
}

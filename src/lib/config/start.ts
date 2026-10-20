/**
 * The first list: what a visitor with no account is given, the numbers that bound it,
 * and the names in one place.
 *
 * A visitor answers two questions, says where they are, and is given one full
 * personalized list built by the same scoring the signed-in app uses, from a made-up
 * profile that holds only those answers. Nothing about them is stored on our side: the
 * location is used once, to look for places, and is not kept. What the browser keeps
 * (see lib/start/storage.ts) is the answers and the ids of the places, never a name,
 * photo or rating, which Google's terms do not let us keep.
 */

/** Where the first-list page lives. */
export const START_PATH = "/start";

/** The campaign label a first-list signup carries, so signups can be traced to it. */
export const FIRST_LIST_SRC = "first-list";

/** How many places the first list holds (a list is 3 to 10, see config/lists.ts). */
export const FIRST_LIST_PLACES = 6;

/** How far from the visitor to look. A starting value. */
export const FIRST_LIST_RADIUS_MILES = 20;

/** The browser storage key, versioned so a later change can ignore what an earlier one wrote. */
export const FIRST_LIST_STORAGE_KEY = "zolo:first-list:v1";

/** A kept-but-unclaimed list older than this is forgotten: it is stale, and so is the person's intent. */
export const FIRST_LIST_MAX_AGE_DAYS = 30;

/**
 * Per visitor address, so one visitor cannot run up Google calls by asking over and
 * over. A starting value. (This is a soft cap: it lives in the memory of one server
 * instance. The daily ceiling in config/usage.ts is the one that bounds the bill.)
 */
export const START_LIST_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;

/** Looking up the places of a list the visitor already has (a page reload, or back from a place). */
export const START_RESTORE_LIMIT = { max: 20, windowMs: 10 * 60_000 } as const;

/** Keeping the list once there is an account: per person. */
export const START_CLAIM_LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;

/**
 * The measurement events, and the rule that keeps them free of personal data.
 *
 * The twelve names below are also a CHECK constraint on analytics_events, so a
 * typo cannot create a new, unreviewed event. Adding one takes a migration.
 *
 * "No PII in event properties" is enforced here, structurally, not by trust:
 * each event may carry only the properties on its allowlist, and every value
 * must be a short lowercase token ([a-z0-9_.:-]) or a boolean/number. Free text
 * (names, emails, search queries, place names) cannot pass that test, so it
 * cannot be stored by accident. Who did it is the user id on the row; what
 * campaign brought them is the src/code columns; neither lives in props.
 */

export const ANALYTICS_EVENTS = [
  "students_page_view",
  "signup_started",
  "signup_completed",
  "edu_verified",
  "first_place_view",
  "place_saved",
  "surprise_me_used",
  "share_created",
  "share_link_opened",
  "share_to_signup",
  "promo_redeemed",
  "premium_started",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

/**
 * Events a browser may send to the public endpoint. These are the ones that
 * happen before there is a trustworthy server-side moment (a page view, the
 * start of a signup, a shared link being opened: that page is built once and
 * reused, so only the browser sees each visit). Everything else is recorded by
 * the server, where it actually happens, and a client cannot forge it.
 */
export const CLIENT_EVENTS: readonly AnalyticsEvent[] = ["students_page_view", "signup_started", "share_link_opened"];

/** The only property keys each event may carry. Anything else is dropped. */
export const PROP_ALLOWLIST: Record<AnalyticsEvent, readonly string[]> = {
  students_page_view: ["campus"],
  signup_started: ["method"],
  signup_completed: ["method"],
  edu_verified: ["campus"],
  first_place_view: [],
  place_saved: ["category"],
  surprise_me_used: ["reroll"],
  share_created: ["kind"],
  share_link_opened: ["kind"],
  share_to_signup: ["kind"],
  promo_redeemed: [],
  premium_started: ["interval", "trial"],
};

export type PropValue = string | number | boolean;

const TOKEN = /^[a-z0-9_.:-]{1,40}$/;

/**
 * Keeps only allowlisted keys whose values are short tokens, booleans, or
 * finite numbers. Strings are lowercased first. Returns a fresh object.
 */
export function sanitizeProps(event: AnalyticsEvent, props: unknown): Record<string, PropValue> {
  const out: Record<string, PropValue> = {};
  if (!props || typeof props !== "object" || Array.isArray(props)) return out;

  const allowed = PROP_ALLOWLIST[event];
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (!allowed.includes(key)) continue;
    if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string") {
      const token = value.trim().toLowerCase();
      if (TOKEN.test(token)) out[key] = token;
    }
  }
  return out;
}

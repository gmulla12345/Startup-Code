/**
 * Everything that governs external-API spend lives in this one file: the
 * per-user daily limits, the list prices used to ESTIMATE cost, and the day
 * boundary. Change a number here and nowhere else.
 *
 * "Estimated" matters: costs are list price per call, ignoring Google's monthly
 * free caps and any Anthropic discounts. The real bill is Google Cloud Billing
 * and the Anthropic Console; this table exists to attribute spend to features
 * and users and to stop a runaway one.
 */

/** Daily counters reset at midnight in this zone (the product's campus is Eastern). */
export const USAGE_TIMEZONE = "America/New_York";

/**
 * Per-user, per-day limits.
 *   ai      — Claude requests (each structured-tool call is one).
 *   places  — real requests to Google Maps Platform (Nearby Search, Place
 *             Details, Place Photos, Geocoding). Answers served from our own
 *             cache are free and are not counted; only a miss that actually
 *             calls Google is.
 *
 * Generous on purpose: normal use never gets near these. They exist to stop a
 * script, a loop, or a bug from running up the bill on one account.
 */
export const DAILY_LIMITS = {
  free: { ai: 10, places: 100 },
  premium: { ai: 60, places: 400 },
} as const;

/**
 * Daily ceilings on Google calls made for visitors with NO account, counted across
 * all of them, per feature. A per-user limit cannot stop a spike that comes from
 * strangers (a shared link going around a campus), so these do. Reaching one only
 * turns off the live Google details for the rest of the day: the page still loads,
 * with what we hold ourselves. Counted from api_usage_events, and only cache misses
 * reach Google at all. A starting value: change it here.
 */
export const ANONYMOUS_DAILY_PLACES_CAPS: Readonly<Record<string, number>> = {
  share_preview: 200,
  // A shared list shows up to ten places, so one opened link can be ten calls (about once an hour).
  list_preview: 400,
  // A first list is one Places search (up to seven calls) plus the places of a list being asked for again,
  // so 350 units is about 50 first lists a day, roughly twelve dollars at list price. A starting value.
  start_list: 350,
};

export type UsageBucket = "ai" | "places";
export type UsagePlan = keyof typeof DAILY_LIMITS;

/**
 * Google Maps Platform list price per call, USD. Source: Google's pricing page
 * (last updated 2026-10-08). Place Details is the Pro SKU ($17/1000) plus the
 * Contact ($3) and Atmosphere ($5) data SKUs, because we request those fields.
 */
export const PLACES_COST_USD = {
  nearby_search: 0.032,
  place_details: 0.025,
  // A shared-link preview asks only for name, address, type and photo: the Pro SKU
  // ($17/1000) with no Contact or Atmosphere fields.
  place_details_share: 0.017,
  place_photo: 0.007,
  geocode: 0.005,
  reverse_geocode: 0.005,
} as const;

export type PlacesOperation = keyof typeof PLACES_COST_USD;

/** Claude list price, USD per million tokens. Source: Anthropic's model table. */
export const CLAUDE_PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-fable-5-1": { input: 10, output: 50 },
};

/** Used when a model id isn't in the table above: priced as the dearest Sonnet so spend is never understated to zero. */
export const CLAUDE_FALLBACK_PRICE = { input: 2, output: 10 };

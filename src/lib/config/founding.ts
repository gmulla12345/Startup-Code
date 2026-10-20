/**
 * Founding student spots: the names and the timings in one place. The NUMBERS (how many
 * spots, and when to start showing how many are left) are not here: the owner sets them in
 * the app_config table in Supabase and can change them at any time, with no deploy.
 *
 *   founding_student_cap         how many students may hold the student price at once.
 *                                Not set: no limit (the student plan is open to every verified student).
 *   founding_student_show_below  show "N spots left" only when FEWER than this many remain.
 *                                Not set: the number is never shown.
 *
 * To set them, in the Supabase SQL editor:
 *   insert into app_config (key, value) values ('founding_student_cap', '100')
 *     on conflict (key) do update set value = excluded.value, updated_at = now();
 *   insert into app_config (key, value) values ('founding_student_show_below', '20')
 *     on conflict (key) do update set value = excluded.value, updated_at = now();
 * To lift the limit again, delete the row.
 *
 * A value that is present but is not a whole number of at least 1 is treated as a mistake and
 * fails safe: an unreadable cap closes the offer (it never opens it to everyone by accident),
 * and an unreadable threshold never shows a number.
 */

export const FOUNDING_CAP_KEY = "founding_student_cap";
export const FOUNDING_SHOW_BELOW_KEY = "founding_student_show_below";

/**
 * How long a founding checkout page stays open, and how long its spot is held. Stripe needs a
 * checkout session to last at least 30 minutes, so the page lasts 31 (see checkout.ts) and the
 * spot is held a few minutes longer than that, so a spot is never given away while the page that
 * would use it can still be paid.
 */
export const FOUNDING_SESSION_MINUTES = 31;
export const FOUNDING_RESERVATION_MINUTES = 36;

/** The public, cached answer the pricing page asks for. */
export const FOUNDING_STATUS_PATH = "/api/pricing/founding";

/** Reading the status from a browser, per address. */
export const FOUNDING_STATUS_LIMIT = { max: 60, windowMs: 60_000 } as const;

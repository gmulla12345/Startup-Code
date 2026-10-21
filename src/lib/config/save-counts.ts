/**
 * "Saved by N students nearby this week": the numbers and names in one place.
 *
 * The count is real or absent. It is how many DIFFERENT verified students, within SAVE_COUNT_RADIUS_MILES of the person
 * looking, saved a place in the last SAVE_COUNT_WINDOW_DAYS days (see place_save_counts in the database and
 * lib/social-proof/save-counts.ts). It is shown only when the count reaches a minimum that the OWNER sets, and it is
 * OFF until the owner sets one: no number is ever shown while the setting is absent.
 *
 * To turn it on, or change it, in the Supabase SQL editor (no deploy):
 *   insert into app_config (key, value) values ('save_count_show_min', '5')
 *     on conflict (key) do update set value = excluded.value, updated_at = now();
 * To turn it off again, delete the row.
 *
 * A number is never shown below SAVE_COUNT_FLOOR, whatever is set: a count of one or two points at particular people.
 * A setting below the floor is read as the floor; one that is not a whole number turns the counts off.
 */

export const SAVE_COUNT_MIN_KEY = "save_count_show_min";

/** The smallest number that may ever be shown. The database refuses a smaller minimum as well. */
export const SAVE_COUNT_FLOOR = 3;

/** "Nearby": the viewer's own profile location, and the savers' profile locations, within this many miles. A starting value. */
export const SAVE_COUNT_RADIUS_MILES = 25;

/** "This week": saves made in the last this many days. */
export const SAVE_COUNT_WINDOW_DAYS = 7;

/** The most places asked about in one call. A page shows a few lists of up to ten. */
export const SAVE_COUNT_MAX_PLACES = 200;

// COPY: the line under a place that enough nearby students have saved this week (kept here, away from the server code, so a
// client component can show it)
export function saveCountLine(count: number): string {
  return `Saved by ${count} students nearby this week`;
}

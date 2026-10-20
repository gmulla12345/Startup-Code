/**
 * The dates of a list that is not always open ("This week's lists"). A list may have a start and
 * an end, as calendar dates (YYYY-MM-DD). It is shown from its first day through the whole of its
 * last day, in one time zone (LIST_TIMEZONE), and not at all outside that. A list with no dates is
 * always open. Pure functions of a date, so the rule can be tested without a clock.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written YYYY-MM-DD (so 2026-02-30 is not one). */
export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today's date in the given zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // The "en-CA" locale writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export type WindowState = "open" | "upcoming" | "ended";

/** Whether a list is open today, not yet open, or over. Dates compare correctly as text because they are zero-padded. */
export function windowState(window: { startsOn: string | null; endsOn: string | null }, today: string): WindowState {
  if (window.startsOn && today < window.startsOn) return "upcoming";
  if (window.endsOn && today > window.endsOn) return "ended";
  return "open";
}

const utc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

/**
 * The quiet line under a list that ends: "Through Sunday" when the last day is within the coming
 * week, "Through November 1" when it is further off, and "Through today" on the last day itself.
 */
export function throughLine(endsOn: string, today: string): string {
  // COPY: the quiet line under a list that ends
  const days = Math.round((utc(endsOn).getTime() - utc(today).getTime()) / 86_400_000);
  if (days <= 0) return "Through today";
  if (days <= 6) return `Through ${new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(utc(endsOn))}`;
  return `Through ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(utc(endsOn))}`;
}

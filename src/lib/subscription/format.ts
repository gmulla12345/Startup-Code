import { LIST_TIMEZONE } from "@/lib/config/lists";

/**
 * A date for a person to read: "November 12", with the year only when it is not this year. Read in the product's
 * own time zone (the same one the dated lists use), so a payment that falls on the evening of the 12th is never
 * announced as the 13th.
 */
export function formatDay(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "the end of this period";
  const date = new Date(iso);
  const year = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: LIST_TIMEZONE, year: "numeric" }).format(d);
  const withYear = year(date) !== year(now);
  return new Intl.DateTimeFormat("en-US", { timeZone: LIST_TIMEZONE, month: "long", day: "numeric", ...(withYear ? { year: "numeric" } : {}) }).format(date);
}

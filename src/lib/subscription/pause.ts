/**
 * Pausing a subscription for a month, as dates. Pure functions, so the rules can be tested without a clock or Stripe.
 *
 * The idea: a person who pauses has already paid for the period they are in, so Premium continues until that period
 * ends (the "from" date). The month after it is skipped: Stripe voids that month's invoice, nothing is charged, and the
 * account rests on Free until the following period starts (the "until" date), when billing resumes on its own.
 *
 *   paid period      skipped month        billing again
 *   ----------- from ------------- until ---------------
 *   Premium          Free                 Premium
 *
 * "until" must be exactly where Stripe's next period ends, because that is the moment the next payment is taken.
 * Stripe anchors a monthly subscription to the day it started (a subscription begun on the 31st renews on the last
 * day of a shorter month, then on the 31st again), so the next end is computed from the anchor, not from "from" + 30 days.
 */

/** Billing is told to resume this long before the skipped month ends, so the payment at its end is never voided by a late resume. */
export const PAUSE_RESUME_MARGIN_SECONDS = 60 * 60;

/** A pause cannot be set once the paid period is about to end: Stripe is creating the next invoice by then. */
export const PAUSE_MIN_LEAD_SECONDS = 60 * 60;

export interface PausedWindow {
  pausedFrom: string | null;
  pausedUntil: string | null;
}

const ms = (iso: string | null): number => (iso ? Date.parse(iso) : NaN);

/** True while the skipped month is under way: the account rests on Free. False before it starts and after it ends. */
export function isInPausedMonth(window: PausedWindow, now: Date = new Date()): boolean {
  const from = ms(window.pausedFrom);
  const until = ms(window.pausedUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until)) return false;
  return from <= now.getTime() && now.getTime() < until;
}

export type PauseState = "none" | "scheduled" | "paused";

/** "scheduled": set, not begun (Premium continues). "paused": the skipped month is under way. "none": no pause, or it is over. */
export function pauseState(window: PausedWindow, now: Date = new Date()): PauseState {
  const from = ms(window.pausedFrom);
  const until = ms(window.pausedUntil);
  if (!Number.isFinite(from) || !Number.isFinite(until)) return "none";
  if (now.getTime() < from) return "scheduled";
  if (now.getTime() < until) return "paused";
  return "none";
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * The end of the period after the one ending at `periodEnd` (unix seconds), for a monthly subscription anchored at
 * `anchor` (unix seconds): the month after, on the anchor's day of the month and time of day, or the last day of that
 * month if it is shorter. Everything in UTC, like Stripe.
 */
export function nextMonthlyPeriodEnd(anchor: number, periodEnd: number): number {
  const a = new Date(anchor * 1000);
  const e = new Date(periodEnd * 1000);
  let year = e.getUTCFullYear();
  let month = e.getUTCMonth() + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  const day = Math.min(a.getUTCDate(), daysInMonth(year, month));
  const next = Date.UTC(year, month, day, a.getUTCHours(), a.getUTCMinutes(), a.getUTCSeconds());
  return Math.floor(next / 1000);
}

export interface PausePlan {
  /** The end of the paid period: Premium continues until then. */
  from: number;
  /** The end of the skipped month: Premium returns, and the payment is taken. */
  until: number;
  /** What to tell Stripe: collection resumes then (just before `until`). */
  resumesAt: number;
}

/** The dates for pausing a monthly subscription, or null if it is too late to (the paid period is about to end or has). */
export function planPause(input: { currentPeriodEnd: number; billingCycleAnchor: number; now?: Date }): PausePlan | null {
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (!Number.isFinite(input.currentPeriodEnd) || !Number.isFinite(input.billingCycleAnchor)) return null;
  if (input.currentPeriodEnd - nowSeconds < PAUSE_MIN_LEAD_SECONDS) return null;
  const until = nextMonthlyPeriodEnd(input.billingCycleAnchor, input.currentPeriodEnd);
  return { from: input.currentPeriodEnd, until, resumesAt: until - PAUSE_RESUME_MARGIN_SECONDS };
}

/** The pause as it is kept on the Stripe subscription (metadata is text), and read back from it. */
export const PAUSE_META_FROM = "pause_from";
export const PAUSE_META_UNTIL = "pause_until";

export function readPauseMetadata(metadata: Record<string, string> | null | undefined): PausedWindow {
  const valid = (value: string | undefined) => (value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null);
  const from = valid(metadata?.[PAUSE_META_FROM]);
  const until = valid(metadata?.[PAUSE_META_UNTIL]);
  if (!from || !until || Date.parse(until) <= Date.parse(from)) return { pausedFrom: null, pausedUntil: null };
  return { pausedFrom: from, pausedUntil: until };
}

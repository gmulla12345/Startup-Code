import { describe, expect, it } from "vitest";
import {
  isInPausedMonth,
  nextMonthlyPeriodEnd,
  PAUSE_MIN_LEAD_SECONDS,
  PAUSE_RESUME_MARGIN_SECONDS,
  pauseState,
  planPause,
  readPauseMetadata,
} from "@/lib/subscription/pause";
import { isPremium, hasSubscription } from "@/lib/subscription/entitlement";
import { describeSubscription } from "@/lib/subscription/state";
import { formatDay } from "@/lib/subscription/format";
import type { Subscription } from "@/types/database";

// The dates of a one-month pause: when Premium rests on Free, when it returns, and what Stripe is told.
// The month arithmetic here was also checked against real Stripe (a test clock, including a subscription
// begun on the 31st) when this was built; these tests keep it from drifting.

const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const at = (iso: string) => new Date(iso);

const window = { pausedFrom: "2026-11-20T17:53:00.000Z", pausedUntil: "2026-12-20T17:53:00.000Z" };
const none = { pausedFrom: null, pausedUntil: null };

describe("the skipped month", () => {
  it("is Free from the end of the paid period until the next one ends, and not before or after", () => {
    expect(isInPausedMonth(window, at("2026-11-20T17:52:59Z"))).toBe(false);
    expect(isInPausedMonth(window, at("2026-11-20T17:53:00Z"))).toBe(true);
    expect(isInPausedMonth(window, at("2026-12-10T00:00:00Z"))).toBe(true);
    expect(isInPausedMonth(window, at("2026-12-20T17:52:59Z"))).toBe(true);
    expect(isInPausedMonth(window, at("2026-12-20T17:53:00Z"))).toBe(false);
  });

  it("is never in effect without both dates", () => {
    expect(isInPausedMonth(none, at("2026-12-01T00:00:00Z"))).toBe(false);
    expect(isInPausedMonth({ pausedFrom: window.pausedFrom, pausedUntil: null }, at("2026-12-01T00:00:00Z"))).toBe(false);
    expect(isInPausedMonth({ pausedFrom: null, pausedUntil: window.pausedUntil }, at("2026-12-01T00:00:00Z"))).toBe(false);
    expect(isInPausedMonth({ pausedFrom: "garbage", pausedUntil: window.pausedUntil }, at("2026-12-01T00:00:00Z"))).toBe(false);
  });

  it("is told apart as scheduled (Premium continues), paused (resting on Free), or none", () => {
    expect(pauseState(window, at("2026-11-01T00:00:00Z"))).toBe("scheduled");
    expect(pauseState(window, at("2026-12-01T00:00:00Z"))).toBe("paused");
    expect(pauseState(window, at("2027-01-01T00:00:00Z"))).toBe("none");
    expect(pauseState(none)).toBe("none");
  });
});

describe("where the next period ends", () => {
  it("is the same day next month, at the same time", () => {
    expect(nextMonthlyPeriodEnd(sec("2026-10-20T17:53:00Z"), sec("2026-11-20T17:53:00Z"))).toBe(sec("2026-12-20T17:53:00Z"));
  });

  it("follows the anchor, not the previous end: a subscription begun on the 31st is back on the 31st after a short month", () => {
    const anchor = sec("2026-01-31T15:30:00Z");
    expect(nextMonthlyPeriodEnd(anchor, sec("2026-02-28T15:30:00Z"))).toBe(sec("2026-03-31T15:30:00Z"));
    expect(nextMonthlyPeriodEnd(anchor, sec("2026-03-31T15:30:00Z"))).toBe(sec("2026-04-30T15:30:00Z"));
    expect(nextMonthlyPeriodEnd(anchor, sec("2026-01-31T15:30:00Z"))).toBe(sec("2026-02-28T15:30:00Z"));
  });

  it("uses the 29th in a leap year", () => {
    expect(nextMonthlyPeriodEnd(sec("2027-12-31T10:00:00Z"), sec("2028-01-31T10:00:00Z"))).toBe(sec("2028-02-29T10:00:00Z"));
  });

  it("carries across the new year", () => {
    expect(nextMonthlyPeriodEnd(sec("2026-12-15T09:00:00Z"), sec("2026-12-15T09:00:00Z"))).toBe(sec("2027-01-15T09:00:00Z"));
  });
});

describe("planning a pause", () => {
  const anchor = sec("2026-10-20T17:53:00Z");
  const end = sec("2026-11-20T17:53:00Z");

  it("keeps Premium to the end of the paid period, skips the next month, and tells Stripe to resume an hour before it ends", () => {
    const plan = planPause({ currentPeriodEnd: end, billingCycleAnchor: anchor, now: at("2026-11-01T00:00:00Z") });
    expect(plan).toEqual({ from: end, until: sec("2026-12-20T17:53:00Z"), resumesAt: sec("2026-12-20T17:53:00Z") - PAUSE_RESUME_MARGIN_SECONDS });
    // collection resumes inside the skipped month, so the payment at its end is never voided, and after its start
    expect(plan!.resumesAt).toBeGreaterThan(plan!.from);
    expect(plan!.resumesAt).toBeLessThan(plan!.until);
  });

  it("refuses when the paid period is about to end or has ended: Stripe is making the next invoice by then", () => {
    expect(planPause({ currentPeriodEnd: end, billingCycleAnchor: anchor, now: new Date((end - PAUSE_MIN_LEAD_SECONDS + 1) * 1000) })).toBeNull();
    expect(planPause({ currentPeriodEnd: end, billingCycleAnchor: anchor, now: new Date((end + 5) * 1000) })).toBeNull();
    expect(planPause({ currentPeriodEnd: end, billingCycleAnchor: anchor, now: new Date((end - PAUSE_MIN_LEAD_SECONDS) * 1000) })).not.toBeNull();
  });

  it("refuses when it has no dates to work from", () => {
    expect(planPause({ currentPeriodEnd: NaN, billingCycleAnchor: anchor })).toBeNull();
    expect(planPause({ currentPeriodEnd: end, billingCycleAnchor: NaN })).toBeNull();
  });
});

describe("the pause kept on the Stripe subscription", () => {
  it("reads back two valid dates in order", () => {
    expect(readPauseMetadata({ pause_from: "2026-11-20T17:53:00Z", pause_until: "2026-12-20T17:53:00Z" })).toEqual(window);
  });

  it("reads nothing from missing, broken, or backwards dates (a pause is two dates or none)", () => {
    expect(readPauseMetadata(undefined)).toEqual(none);
    expect(readPauseMetadata({})).toEqual(none);
    expect(readPauseMetadata({ pause_from: "2026-11-20T17:53:00Z" })).toEqual(none);
    expect(readPauseMetadata({ pause_from: "x", pause_until: "y" })).toEqual(none);
    expect(readPauseMetadata({ pause_from: "", pause_until: "" })).toEqual(none); // how Stripe returns a cleared key, if it returns it at all
    expect(readPauseMetadata({ pause_from: "2026-12-20T17:53:00Z", pause_until: "2026-11-20T17:53:00Z" })).toEqual(none);
  });
});

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  userId: "u1",
  stripeCustomerId: "cus_1",
  stripeSubscriptionId: "sub_1",
  stripePriceId: "price_standard",
  status: "active",
  planId: "premium",
  currentPeriodEnd: "2026-11-20T17:53:00.000Z",
  cancelAtPeriodEnd: false,
  pausedFrom: null,
  pausedUntil: null,
  digistore24OrderId: null,
  digistore24ManageUrl: null,
  createdAt: "2026-10-20T00:00:00Z",
  updatedAt: "2026-10-20T00:00:00Z",
  ...over,
});

describe("Premium, and the skipped month", () => {
  const paused = sub({ ...window });

  it("is in effect before a pause begins, rests on Free during it, and returns after", () => {
    expect(isPremium(paused, at("2026-11-01T00:00:00Z"))).toBe(true);
    expect(isPremium(paused, at("2026-12-01T00:00:00Z"))).toBe(false);
    expect(isPremium(paused, at("2026-12-20T17:53:00Z"))).toBe(true);
  });

  it("is still a subscription during the skipped month, so nothing is sold to them twice", () => {
    expect(hasSubscription(paused)).toBe(true);
    expect(hasSubscription(sub({ status: "canceled", planId: "free" }))).toBe(false);
    expect(hasSubscription(null)).toBe(false);
  });

  it("does not turn a lapsed subscription into Premium", () => {
    expect(isPremium(sub({ ...window, status: "past_due" }), at("2026-11-01T00:00:00Z"))).toBe(false);
  });
});

describe("what the profile says about a subscription", () => {
  it("tells apart free, premium, ending, a pause not yet begun, and a month paused", () => {
    expect(describeSubscription(null).kind).toBe("free");
    expect(describeSubscription(sub({ status: "none", planId: "free" })).kind).toBe("free");
    expect(describeSubscription(sub(), at("2026-11-01T00:00:00Z"))).toEqual({ kind: "premium", student: false, managedBy: "stripe" });
    expect(describeSubscription(sub({ cancelAtPeriodEnd: true }), at("2026-11-01T00:00:00Z"))).toEqual({ kind: "ending", endsOn: "2026-11-20T17:53:00.000Z", student: false });
    expect(describeSubscription(sub({ ...window }), at("2026-11-01T00:00:00Z"))).toEqual({ kind: "pause_scheduled", from: window.pausedFrom, until: window.pausedUntil, student: false });
    expect(describeSubscription(sub({ ...window }), at("2026-12-01T00:00:00Z"))).toEqual({ kind: "paused", until: window.pausedUntil, student: false });
  });

  it("calls a pause that is over just Premium again", () => {
    expect(describeSubscription(sub({ ...window }), at("2027-01-01T00:00:00Z")).kind).toBe("premium");
  });

  it("sends Premium bought through Digistore24 to Digistore24", () => {
    expect(describeSubscription(sub({ digistore24ManageUrl: "https://ds24.example/manage" }))).toMatchObject({ kind: "premium", managedBy: "digistore24" });
  });
});

describe("a date for a person to read", () => {
  const now = at("2026-10-20T12:00:00Z");
  it("is the month and the day, in the product's own time zone, with the year only when it is not this year", () => {
    expect(formatDay("2026-11-20T17:53:00.000Z", now)).toBe("November 20");
    expect(formatDay("2027-01-05T17:53:00.000Z", now)).toBe("January 5, 2027");
  });
  it("does not move a late-evening payment to the next day", () => {
    // 02:30 UTC on the 21st is the evening of the 20th in New York
    expect(formatDay("2026-11-21T02:30:00.000Z", now)).toBe("November 20");
  });
  it("says something plain when there is no date", () => {
    expect(formatDay(null)).toBe("the end of this period");
    expect(formatDay("nonsense")).toBe("the end of this period");
  });
});

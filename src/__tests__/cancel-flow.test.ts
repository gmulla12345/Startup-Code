import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Call } from "./helpers/fake-admin";
import { ok } from "./helpers/fake-admin";

// The smaller alternatives to cancelling, and cancelling: who is offered what, what is sent to Stripe,
// and that a refusal changes nothing. Stripe and the database are stood in for; the real Stripe behavior
// these calls rely on (the voided month, billing resuming, the price change with no charge today) was
// checked against Stripe's test mode with a test clock when this was built.

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
  retrieve: vi.fn(),
  update: vi.fn(),
  reserve: vi.fn(),
  release: vi.fn(),
  upsert: vi.fn(),
  onSale: true,
}));

vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeAdmin: make } = await import("./helpers/fake-admin");
  return {
    createAdminClient: () =>
      make((call) => (h.db[call.table] ? (h.db[call.table](call) as never) : { data: null, error: null }), h.calls),
  };
});
vi.mock("@/lib/stripe/client", () => ({ getStripeClient: () => ({ subscriptions: { retrieve: h.retrieve, update: h.update } }) }));
vi.mock("@/lib/founding/offer", () => ({ reserveFoundingSlot: h.reserve, releaseFoundingSlot: h.release }));
vi.mock("@/lib/stripe/webhook-handlers", () => ({ upsertSubscriptionRow: h.upsert }));
vi.mock("@/lib/config/pricing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/config/pricing")>();
  return {
    ...original,
    pricing: { ...original.pricing, premium: { ...original.pricing.premium, priceId: "price_standard", annualPriceId: "price_annual" } },
    isStudentPlanConfigured: () => h.onSale,
    studentPriceId: () => "price_student",
    isStudentPriceId: (id: string | null | undefined) => id === "price_student",
  };
});

import { ApiError } from "@/lib/api/auth";
import {
  CANCEL_FLOW_MESSAGES,
  cancelAtPeriodEnd,
  cancelOptions,
  keepPremium,
  pauseForMonth,
  switchToStudent,
  undoPause,
} from "@/lib/stripe/cancel-flow";
import { PAUSE_RESUME_MARGIN_SECONDS } from "@/lib/subscription/pause";
import { STUDENT_PLAN_MESSAGES } from "@/lib/stripe/student-plan";
import type { Subscription } from "@/types/database";

const sec = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const NOW = "2026-11-01T12:00:00Z";
const END = "2026-11-20T17:53:00Z";
const NEXT = "2026-12-20T17:53:00Z";

const row = (over: Record<string, unknown> = {}) => ({ stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", digistore24_order_id: null, ...over });
const item = (over: Record<string, unknown> = {}) => ({
  id: "si_1",
  price: { id: "price_standard", recurring: { interval: "month", interval_count: 1 } },
  current_period_end: sec(END),
  ...over,
});
const stripeSub = (over: Record<string, unknown> = {}, itemOver: Record<string, unknown> = {}) => ({
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  cancel_at_period_end: false,
  pause_collection: null,
  metadata: {},
  billing_cycle_anchor: sec("2026-10-20T17:53:00Z"),
  items: { data: [item(itemOver)] },
  ...over,
});

const given = (stripe = stripeSub(), dbRow: Record<string, unknown> | null = row(), eduVerified = true) => {
  h.db.subscriptions = () => ok(dbRow);
  h.db.profiles = () => ok({ edu_verified_at: eduVerified ? "2026-09-01T00:00:00Z" : null });
  h.retrieve.mockResolvedValue(stripe);
  h.update.mockImplementation(async (_id: string, params: Record<string, unknown>) => ({ ...stripe, _updated: params }));
};
const sent = () => h.update.mock.calls[0][1] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const refusal = async (promise: Promise<unknown>) => {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
};
const changedNothing = () => {
  expect(h.update).not.toHaveBeenCalled();
  expect(h.upsert).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  h.calls.length = 0;
  h.db = {};
  h.onSale = true;
  h.retrieve.mockReset();
  h.update.mockReset();
  h.reserve.mockReset().mockResolvedValue({ capped: false });
  h.release.mockReset().mockResolvedValue(undefined);
  h.upsert.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------------------------------

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
const facts = { eduVerified: true, studentOnSale: true, studentOpen: true, now: new Date(NOW) };

describe("which alternatives are offered", () => {
  it("offers both to a monthly Premium subscriber with a verified school email, and says when Premium would end", () => {
    expect(cancelOptions({ subscription: sub(), ...facts })).toEqual({ endsOn: "2026-11-20T17:53:00.000Z", student: true, pause: true });
  });

  it("offers nothing to a person with no subscription we can act on: free, lapsed, or Premium bought through Digistore24", () => {
    const none = { endsOn: null, student: false, pause: false };
    expect(cancelOptions({ subscription: null, ...facts })).toEqual(none);
    expect(cancelOptions({ subscription: sub({ status: "canceled", planId: "free" }), ...facts })).toEqual(none);
    expect(cancelOptions({ subscription: sub({ stripeSubscriptionId: null }), ...facts })).toEqual(none);
    expect(cancelOptions({ subscription: sub({ digistore24OrderId: "ds-1", digistore24ManageUrl: "https://ds24.example" }), ...facts })).toEqual(none);
  });

  it("offers the student price only while it is on sale, has a spot, and the school email is verified", () => {
    expect(cancelOptions({ subscription: sub(), ...facts, studentOnSale: false }).student).toBe(false);
    expect(cancelOptions({ subscription: sub(), ...facts, studentOpen: false }).student).toBe(false);
    expect(cancelOptions({ subscription: sub(), ...facts, eduVerified: false }).student).toBe(false);
  });

  it("offers the student price only to the standard monthly price: not annual, and not to someone already on it", () => {
    expect(cancelOptions({ subscription: sub({ stripePriceId: "price_annual" }), ...facts }).student).toBe(false);
    expect(cancelOptions({ subscription: sub({ stripePriceId: "price_student" }), ...facts }).student).toBe(false);
  });

  it("offers a pause only to a monthly subscriber who has paid: not in a trial, not annual", () => {
    expect(cancelOptions({ subscription: sub({ status: "trialing" }), ...facts }).pause).toBe(false);
    expect(cancelOptions({ subscription: sub({ stripePriceId: "price_annual" }), ...facts }).pause).toBe(false);
    expect(cancelOptions({ subscription: sub({ stripePriceId: "price_student" }), ...facts }).pause).toBe(true); // a student subscriber may pause
  });

  it("offers a pause until the paid period is about to end, not after", () => {
    const soon = sub({ currentPeriodEnd: "2026-11-01T12:30:00.000Z" }); // half an hour away
    expect(cancelOptions({ subscription: soon, ...facts }).pause).toBe(false);
    expect(cancelOptions({ subscription: sub({ currentPeriodEnd: null }), ...facts }).pause).toBe(false);
  });

  it("offers nothing more to someone already ending or paused", () => {
    expect(cancelOptions({ subscription: sub({ cancelAtPeriodEnd: true }), ...facts })).toMatchObject({ student: false, pause: false });
    const paused = sub({ pausedFrom: "2026-11-20T17:53:00.000Z", pausedUntil: "2026-12-20T17:53:00.000Z" });
    expect(cancelOptions({ subscription: paused, ...facts })).toMatchObject({ student: false, pause: false });
  });
});

// ---------------------------------------------------------------------------------------------------

describe("every action is on the caller's own subscription and nothing else", () => {
  it("finds the subscription from who is asking (our record), never from the request", async () => {
    given();
    await cancelAtPeriodEnd("u1");
    expect(h.calls.find((c) => c.table === "subscriptions")?.filters).toEqual({ user_id: "u1" });
    expect(h.retrieve).toHaveBeenCalledWith("sub_1");
  });

  it("refuses a Stripe subscription that is not this customer's, and changes nothing", async () => {
    given(stripeSub({ customer: "cus_someone_else" }));
    expect((await refusal(cancelAtPeriodEnd("u1"))).status).toBe(404);
    changedNothing();
  });

  it("says there is nothing to change when there is no subscription, and that Digistore24 manages its own", async () => {
    given(stripeSub(), null);
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.none);
    given(stripeSub(), row({ stripe_subscription_id: null, digistore24_order_id: "ds-1" }));
    const ds = await refusal(cancelAtPeriodEnd("u1"));
    expect([ds.status, ds.message]).toEqual([400, CANCEL_FLOW_MESSAGES.elsewhere]);
    expect(h.retrieve).not.toHaveBeenCalled();
    changedNothing();
  });

  it("does not act on a subscription that is not live", async () => {
    for (const status of ["canceled", "past_due", "incomplete", "unpaid"]) {
      given(stripeSub({ status }));
      expect((await refusal(cancelAtPeriodEnd("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.notLive);
    }
    changedNothing();
  });
});

describe("switching to the student price", () => {
  it("moves a monthly Premium subscription to the student price with nothing charged today, holds a spot first, and mirrors the result", async () => {
    given();
    const out = await switchToStudent("u1");
    expect(out.priceMonthly).toBeGreaterThan(0);
    expect(sent()).toEqual({ items: [{ id: "si_1", price: "price_student" }], proration_behavior: "none", metadata: { plan: "student" } });
    expect(h.reserve).toHaveBeenCalledWith("u1");
    expect(h.reserve.mock.invocationCallOrder[0]).toBeLessThan(h.update.mock.invocationCallOrder[0]);
    expect(h.upsert).toHaveBeenCalledWith("u1", expect.objectContaining({ id: "sub_1" }));
    expect(h.release).not.toHaveBeenCalled();
  });

  it("can be done during a trial", async () => {
    given(stripeSub({ status: "trialing" }));
    await switchToStudent("u1");
    expect(h.update).toHaveBeenCalledTimes(1);
  });

  it("is refused, before anything else, while the plan is not on sale", async () => {
    h.onSale = false;
    given();
    expect((await refusal(switchToStudent("u1"))).status).toBe(503);
    expect(h.retrieve).not.toHaveBeenCalled();
    changedNothing();
  });

  it("is refused for an account without a verified school email, before Stripe is asked", async () => {
    given(stripeSub(), row(), false);
    const error = await refusal(switchToStudent("u1"));
    expect([error.status, error.message]).toEqual([403, STUDENT_PLAN_MESSAGES.notVerified]);
    expect(h.retrieve).not.toHaveBeenCalled();
    changedNothing();
  });

  it("is refused for an annual subscription and for someone already on the student price", async () => {
    given(stripeSub({}, { price: { id: "price_annual", recurring: { interval: "year", interval_count: 1 } } }));
    expect((await refusal(switchToStudent("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.studentMonthly);
    given(stripeSub({}, { price: { id: "price_student", recurring: { interval: "month", interval_count: 1 } } }));
    expect((await refusal(switchToStudent("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.studentOther);
    expect(h.reserve).not.toHaveBeenCalled();
    changedNothing();
  });

  it("is refused for a subscription that is ending or paused", async () => {
    given(stripeSub({ cancel_at_period_end: true }));
    expect((await refusal(switchToStudent("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.studentOther);
    given(stripeSub({ pause_collection: { behavior: "void", resumes_at: 1 } }));
    expect((await refusal(switchToStudent("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.studentOther);
    changedNothing();
  });

  it("is refused, and changes nothing, when the founding spots are gone", async () => {
    given();
    h.reserve.mockRejectedValue(new ApiError(409, STUDENT_PLAN_MESSAGES.full));
    expect((await refusal(switchToStudent("u1"))).message).toBe(STUDENT_PLAN_MESSAGES.full);
    changedNothing();
  });

  it("gives the held spot back if Stripe fails, and records nothing", async () => {
    given();
    h.update.mockRejectedValue(new Error("stripe is down"));
    await expect(switchToStudent("u1")).rejects.toThrow("stripe is down");
    expect(h.release).toHaveBeenCalledWith("u1");
    expect(h.upsert).not.toHaveBeenCalled();
  });
});

describe("pausing for a month", () => {
  it("voids the month after the paid period and resumes billing an hour before it ends, keeping both dates on the subscription", async () => {
    given();
    const out = await pauseForMonth("u1");
    expect(out).toEqual({ from: "2026-11-20T17:53:00.000Z", until: "2026-12-20T17:53:00.000Z" });
    expect(sent()).toEqual({
      pause_collection: { behavior: "void", resumes_at: sec(NEXT) - PAUSE_RESUME_MARGIN_SECONDS },
      metadata: { pause_from: "2026-11-20T17:53:00.000Z", pause_until: "2026-12-20T17:53:00.000Z" },
    });
    expect(h.upsert).toHaveBeenCalledWith("u1", expect.anything());
  });

  it("follows Stripe's own anchor for the end of the skipped month (a subscription begun on the 31st)", async () => {
    vi.setSystemTime(new Date("2026-02-10T00:00:00Z"));
    given(stripeSub({ billing_cycle_anchor: sec("2026-01-31T15:30:00Z") }, { current_period_end: sec("2026-02-28T15:30:00Z") }));
    expect((await pauseForMonth("u1")).until).toBe("2026-03-31T15:30:00.000Z");
  });

  it("is refused before the first payment (a trial), once ending, and when already paused", async () => {
    given(stripeSub({ status: "trialing" }));
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.pauseAfterPayment);
    given(stripeSub({ cancel_at_period_end: true }));
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.alreadyEnding);
    given(stripeSub({ pause_collection: { behavior: "void", resumes_at: 1 } }));
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.alreadyPaused);
    given(stripeSub({ metadata: { pause_from: END, pause_until: NEXT } })); // a pause recorded but not yet in Stripe's own field
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.alreadyPaused);
    changedNothing();
  });

  it("is refused for an annual subscription, where a month's pause would skip nothing", async () => {
    given(stripeSub({}, { price: { id: "price_annual", recurring: { interval: "year", interval_count: 1 } } }));
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.pauseMonthly);
    changedNothing();
  });

  it("is refused when the next payment is about to be taken", async () => {
    vi.setSystemTime(new Date("2026-11-20T17:30:00Z"));
    given();
    expect((await refusal(pauseForMonth("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.pauseTooLate);
    changedNothing();
  });

  it("is undone only before it begins, and only by clearing both the pause and our two dates", async () => {
    given(stripeSub({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { pause_from: END, pause_until: NEXT } }));
    await undoPause("u1");
    expect(sent()).toEqual({ pause_collection: "", metadata: { pause_from: "", pause_until: "" } });
    expect(h.upsert).toHaveBeenCalledTimes(1);
  });

  it("cannot be undone once the skipped month is under way, or when there is none", async () => {
    vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
    given(stripeSub({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { pause_from: END, pause_until: NEXT } }));
    expect((await refusal(undoPause("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.noPause);
    given();
    expect((await refusal(undoPause("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.noPause);
    changedNothing();
  });
});

describe("cancelling", () => {
  it("ends the subscription at the close of the paid period, with one request, and says when", async () => {
    given();
    expect(await cancelAtPeriodEnd("u1")).toEqual({ endsOn: "2026-11-20T17:53:00.000Z" });
    expect(sent()).toEqual({ cancel_at_period_end: true });
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.upsert).toHaveBeenCalledTimes(1);
  });

  it("drops a pause that has not begun in the same request, since there is nothing left to pause", async () => {
    given(stripeSub({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { pause_from: END, pause_until: NEXT } }));
    await cancelAtPeriodEnd("u1");
    expect(sent()).toEqual({ cancel_at_period_end: true, pause_collection: "", metadata: { pause_from: "", pause_until: "" } });
  });

  it("leaves a pause that is under way alone: the subscription ends with its month", async () => {
    vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
    given(stripeSub({ pause_collection: { behavior: "void", resumes_at: 1 }, metadata: { pause_from: END, pause_until: NEXT } }, { current_period_end: sec(NEXT) }));
    expect(await cancelAtPeriodEnd("u1")).toEqual({ endsOn: NEXT.replace("Z", ".000Z") });
    expect(sent()).toEqual({ cancel_at_period_end: true });
  });

  it("is not done twice", async () => {
    given(stripeSub({ cancel_at_period_end: true }));
    expect((await refusal(cancelAtPeriodEnd("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.alreadyEnding);
    changedNothing();
  });

  it("can be taken back before it takes effect, and only then", async () => {
    given(stripeSub({ cancel_at_period_end: true }));
    await keepPremium("u1");
    expect(sent()).toEqual({ cancel_at_period_end: false });
    h.update.mockReset();
    h.upsert.mockReset();
    given();
    expect((await refusal(keepPremium("u1"))).message).toBe(CANCEL_FLOW_MESSAGES.notEnding);
    changedNothing();
  });
});

describe("what is said", () => {
  it("is calm: no exclamation points, no pleading, in any message", () => {
    for (const message of Object.values(CANCEL_FLOW_MESSAGES)) {
      expect(message, message).not.toMatch(/!/);
      expect(message, message).not.toMatch(/sorry to see|are you sure|please don't|we.ll miss|before you go/i);
    }
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Call } from "./helpers/fake-admin";
import { ok } from "./helpers/fake-admin";

// The Student plan at checkout: who may have it, what is sent to Stripe, and that it
// works with the student free-month code (the code comes first, then the student price).
// The rules that matter most: the student price is reachable only by an account with a
// verified school email, and a refusal creates nothing at all.

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
  stripeList: vi.fn(),
  sessionCreate: vi.fn(),
  sessionExpire: vi.fn(),
  customerCreate: vi.fn(),
  configured: true,
  reserve: vi.fn(),
  release: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeAdmin: make } = await import("./helpers/fake-admin");
  return {
    createAdminClient: () =>
      make((call) => (h.db[call.table] ? (h.db[call.table](call) as never) : { data: null, error: null }), h.calls),
  };
});
vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: () => ({
    promotionCodes: { list: h.stripeList },
    customers: { create: h.customerCreate },
    checkout: { sessions: { create: h.sessionCreate, expire: h.sessionExpire } },
  }),
}));
vi.mock("@/lib/founding/offer", () => ({ reserveFoundingSlot: h.reserve, releaseFoundingSlot: h.release }));
vi.mock("@/lib/config/pricing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/config/pricing")>();
  return {
    ...original,
    premiumPriceId: (interval: string) => (interval === "annual" ? "price_annual" : "price_monthly"),
    isStudentPlanConfigured: () => h.configured,
    studentPriceId: () => "price_student",
  };
});

import { createCheckoutSession } from "@/lib/stripe/checkout";
import { ApiError } from "@/lib/api/auth";
import { FOUNDING_SESSION_MINUTES } from "@/lib/config/founding";
import { STUDENT_PLAN_MESSAGES } from "@/lib/stripe/student-plan";
import { STUDENT_COUPON_ID } from "@/lib/config/promo";

const stripeCode = (over: Record<string, unknown> = {}) => ({
  id: "promo_1",
  code: "SCHOOL-CLUB",
  active: true,
  expires_at: Math.floor(Date.now() / 1000) + 86_400 * 30,
  max_redemptions: 100,
  times_redeemed: 0,
  restrictions: { first_time_transaction: true },
  promotion: { type: "coupon", coupon: STUDENT_COUPON_ID },
  ...over,
});

const base = { userId: "u1", email: "maya@example.edu", successUrl: "https://z/ok", cancelUrl: "https://z/no" };
const created = () => h.sessionCreate.mock.calls[0][0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const nothingCreated = () => {
  expect(h.sessionCreate).not.toHaveBeenCalled();
  expect(h.customerCreate).not.toHaveBeenCalled();
  expect(h.calls.filter((c) => c.op !== "select" && c.table === "promo_redemptions")).toEqual([]);
};

beforeEach(() => {
  h.calls.length = 0;
  h.configured = true;
  h.reserve.mockReset().mockResolvedValue({ capped: false });
  h.release.mockReset().mockResolvedValue(undefined);
  delete process.env.STUDENT_PROMO_REQUIRE_CARD;
  h.stripeList.mockReset().mockResolvedValue({ data: [stripeCode()] });
  h.sessionCreate.mockReset().mockResolvedValue({ id: "cs_new", url: "https://checkout.stripe.test/cs_new" });
  h.sessionExpire.mockReset().mockResolvedValue({});
  h.customerCreate.mockReset().mockResolvedValue({ id: "cus_1" });
  h.db = {
    subscriptions: (c) => (c.op === "select" && c.filters.user_id ? ok({ stripe_customer_id: "cus_1", stripe_subscription_id: null, digistore24_order_id: null }) : ok()),
    profiles: () => ok({ edu_verified_at: "2026-10-01T00:00:00Z" }),
    payments: () => ok([]),
    promo_redemptions: (c) => (c.op === "select" ? ok(null) : ok({ id: "claim_1" })),
  };
});
afterEach(() => vi.restoreAllMocks());

describe("the student plan, for a verified student", () => {
  it("is charged at the student price, monthly, with the ordinary 7-day trial", async () => {
    await createCheckoutSession({ ...base, plan: "student" });
    const s = created();
    expect(s.line_items).toEqual([{ price: "price_student", quantity: 1 }]);
    expect(s.subscription_data.trial_period_days).toBe(7);
    expect(s.discounts).toBeUndefined();
  });

  it("is tagged as the student plan, on the session and on the subscription", async () => {
    await createCheckoutSession({ ...base, plan: "student" });
    expect(created().metadata.plan).toBe("student");
    expect(created().subscription_data.metadata.plan).toBe("student");
  });

  it("never offers Stripe's own promotion-code box, which would skip the student check", async () => {
    await createCheckoutSession({ ...base, plan: "student" });
    expect(created().allow_promotion_codes).toBeUndefined();
  });

  it("is the same checkout as Premium in every other way: tax, address, customer", async () => {
    await createCheckoutSession({ ...base, plan: "student" });
    const s = created();
    expect(s.mode).toBe("subscription");
    expect(s.customer).toBe("cus_1");
    expect(s.automatic_tax).toEqual({ enabled: true });
    expect(s.billing_address_collection).toBe("required");
  });
});

describe("the student plan with a student code: the free month comes first, then the student price", () => {
  it("applies the code on the student price, replacing the trial, never stacking the two", async () => {
    await createCheckoutSession({ ...base, plan: "student", promoCode: "school-club" });
    const s = created();
    expect(s.line_items).toEqual([{ price: "price_student", quantity: 1 }]);
    expect(s.discounts).toEqual([{ promotion_code: "promo_1" }]);
    expect(s.subscription_data.trial_period_days).toBeUndefined();
    expect(s.metadata.promo_claim).toBe("claim_1");
    expect(s.metadata.plan).toBe("student");
  });

  it("still collects a card by default, so the free month turns into the student price unless they cancel", async () => {
    await createCheckoutSession({ ...base, plan: "student", promoCode: "SCHOOL-CLUB" });
    expect(created().payment_method_collection).toBe("always");
  });

  it("still follows the card setting: no card when the owner has turned the requirement off", async () => {
    process.env.STUDENT_PROMO_REQUIRE_CARD = "false";
    await createCheckoutSession({ ...base, plan: "student", promoCode: "SCHOOL-CLUB" });
    expect(created().payment_method_collection).toBe("if_required");
  });
});

describe("the student plan, refused", () => {
  it("creates nothing for an account without a verified school email", async () => {
    h.db.profiles = () => ok({ edu_verified_at: null });
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toMatchObject({ status: 403, message: STUDENT_PLAN_MESSAGES.notVerified });
    nothingCreated();
  });

  it("creates nothing for an account with no profile at all", async () => {
    h.db.profiles = () => ok(null);
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toMatchObject({ status: 403 });
    nothingCreated();
  });

  it("fails closed when the account cannot be read: no price, no customer, no session", async () => {
    h.db.profiles = () => ({ data: null, error: { message: "boom" } });
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toThrow(/could not check the school email/);
    nothingCreated();
  });

  it("creates nothing for the annual interval: the student price is monthly", async () => {
    await expect(createCheckoutSession({ ...base, plan: "student", billingInterval: "annual" })).rejects.toMatchObject({
      status: 400,
      message: STUDENT_PLAN_MESSAGES.monthlyOnly,
    });
    nothingCreated();
  });

  it("creates nothing while the plan is not on sale (its Stripe price is not set)", async () => {
    h.configured = false;
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toMatchObject({ status: 503, message: STUDENT_PLAN_MESSAGES.unavailable });
    nothingCreated();
  });

  it("is judged before any code is looked at, so a refused student cannot use a code to probe", async () => {
    h.db.profiles = () => ok({ edu_verified_at: null });
    await expect(createCheckoutSession({ ...base, plan: "student", promoCode: "SCHOOL-CLUB" })).rejects.toMatchObject({ message: STUDENT_PLAN_MESSAGES.notVerified });
    expect(h.stripeList).not.toHaveBeenCalled();
    nothingCreated();
  });
});

describe("Premium, unchanged", () => {
  it("is charged at the Premium price and carries no plan tag", async () => {
    await createCheckoutSession({ ...base });
    expect(created().line_items).toEqual([{ price: "price_monthly", quantity: 1 }]);
    expect(created().metadata.plan).toBeUndefined();
    expect(created().subscription_data.metadata.plan).toBeUndefined();
  });

  it("is the same as naming the premium plan, and does not look at the school email", async () => {
    h.db.profiles = () => {
      throw new Error("the profile should not be read for Premium");
    };
    await createCheckoutSession({ ...base, plan: "premium", billingInterval: "annual" });
    expect(created().line_items).toEqual([{ price: "price_annual", quantity: 1 }]);
  });

  it("still works when the student plan is not on sale", async () => {
    h.configured = false;
    await createCheckoutSession({ ...base });
    expect(created().line_items).toEqual([{ price: "price_monthly", quantity: 1 }]);
  });
});

describe("the founding limit on the student price", () => {
  const minute = () => (Date.now() / 60_000) | 0;

  it("holds a spot for the person before anything is created, when the price has a limit", async () => {
    h.reserve.mockResolvedValue({ capped: true });
    await createCheckoutSession({ ...base, plan: "student" });
    expect(h.reserve).toHaveBeenCalledWith("u1");
    expect(h.reserve.mock.invocationCallOrder[0]).toBeLessThan(h.customerCreate.mock.invocationCallOrder[0] ?? Infinity);
    expect(h.reserve.mock.invocationCallOrder[0]).toBeLessThan(h.sessionCreate.mock.invocationCallOrder[0]);
  });

  it("makes the checkout page close by itself, a little over thirty minutes on, so the spot it holds is given back", async () => {
    h.reserve.mockResolvedValue({ capped: true });
    await createCheckoutSession({ ...base, plan: "student" });
    const expiresAt = created().expires_at as number;
    const now = Math.floor(Date.now() / 1000);
    expect(expiresAt).toBeGreaterThanOrEqual(now + 30 * 60); // Stripe's minimum
    expect(expiresAt).toBeLessThanOrEqual(now + (FOUNDING_SESSION_MINUTES + 1) * 60);
    expect(expiresAt).toBe((minute() + FOUNDING_SESSION_MINUTES) * 60);
  });

  it("sends exactly the same closing time for a retry within the minute, which Stripe needs for an idempotent request", async () => {
    h.reserve.mockResolvedValue({ capped: true });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:05Z"));
    await createCheckoutSession({ ...base, plan: "student" });
    vi.setSystemTime(new Date("2026-10-20T12:00:50Z"));
    await createCheckoutSession({ ...base, plan: "student" });
    vi.useRealTimers();
    expect(h.sessionCreate.mock.calls[0][0].expires_at).toBe(h.sessionCreate.mock.calls[1][0].expires_at);
    expect(h.sessionCreate.mock.calls[0][1].idempotencyKey).toBe(h.sessionCreate.mock.calls[1][1].idempotencyKey);
  });

  it("adds nothing to the checkout when the price has no limit", async () => {
    await createCheckoutSession({ ...base, plan: "student" });
    expect(created().expires_at).toBeUndefined();
    expect(h.release).not.toHaveBeenCalled();
  });

  it("creates nothing at all when the spots are gone: no customer, no session, no reservation", async () => {
    h.reserve.mockRejectedValue(new ApiError(409, STUDENT_PLAN_MESSAGES.full));
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toMatchObject({ status: 409, message: STUDENT_PLAN_MESSAGES.full });
    nothingCreated();
  });

  it("refuses an unverified account before it ever takes a spot", async () => {
    h.db.profiles = () => ok({ edu_verified_at: null });
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toMatchObject({ status: 403 });
    expect(h.reserve).not.toHaveBeenCalled();
  });

  it("gives the spot back if Stripe cannot make the checkout", async () => {
    h.reserve.mockResolvedValue({ capped: true });
    h.sessionCreate.mockRejectedValue(new Error("Stripe is down"));
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toThrow("Stripe is down");
    expect(h.release).toHaveBeenCalledWith("u1");
  });

  it("does not give a spot back when Stripe fails and the price has no limit", async () => {
    h.sessionCreate.mockRejectedValue(new Error("Stripe is down"));
    await expect(createCheckoutSession({ ...base, plan: "student" })).rejects.toThrow("Stripe is down");
    expect(h.release).not.toHaveBeenCalled();
  });

  it("never looks at a founding spot for Premium", async () => {
    await createCheckoutSession({ ...base });
    await createCheckoutSession({ ...base, plan: "premium", billingInterval: "annual" });
    expect(h.reserve).not.toHaveBeenCalled();
  });
});

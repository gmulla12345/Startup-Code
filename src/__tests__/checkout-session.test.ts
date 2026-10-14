import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Call } from "./helpers/fake-admin";
import { ok } from "./helpers/fake-admin";

// What the checkout sends to Stripe. The things that must hold: a student code is
// applied by the server and replaces the 7-day trial; Stripe's own promotion-code
// box is never offered; the card flag decides whether a card is collected; and a
// code that fails its checks creates nothing at all.

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
  stripeList: vi.fn(),
  sessionCreate: vi.fn(),
  sessionExpire: vi.fn(),
  customerCreate: vi.fn(),
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
vi.mock("@/lib/config/pricing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/config/pricing")>();
  return { ...original, premiumPriceId: (interval: string) => (interval === "annual" ? "price_annual" : "price_monthly") };
});

import { createCheckoutSession } from "@/lib/stripe/checkout";
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
const writes = () => h.calls.filter((c) => c.op !== "select" && c.table === "promo_redemptions");

beforeEach(() => {
  h.calls.length = 0;
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
afterEach(() => {
  delete process.env.STUDENT_PROMO_REQUIRE_CARD;
});

describe("an ordinary checkout, with no code", () => {
  it("keeps the 7-day trial, and offers no promotion-code box and no discount", async () => {
    await createCheckoutSession(base);
    const s = created();
    expect(s.subscription_data.trial_period_days).toBe(7);
    expect(s).not.toHaveProperty("discounts");
    expect(s).not.toHaveProperty("payment_method_collection");
    expect(s.allow_promotion_codes).not.toBe(true);
    expect(s.metadata).not.toHaveProperty("promo_claim");
    expect(writes()).toHaveLength(0);
  });
});

describe("a student code", () => {
  it("replaces the 7-day trial with the free month, applied by the server", async () => {
    const url = await createCheckoutSession({ ...base, promoCode: "school-club" });
    const s = created();
    expect(url).toBe("https://checkout.stripe.test/cs_new");
    expect(s.discounts).toEqual([{ promotion_code: "promo_1" }]);
    expect(s.subscription_data).not.toHaveProperty("trial_period_days");
    expect(s.line_items).toEqual([{ price: "price_monthly", quantity: 1 }]);
  });

  it("never offers Stripe's own promotion-code box, which would skip the student check", async () => {
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    expect(created().allow_promotion_codes).not.toBe(true);
  });

  it("collects a card by default, so the free month turns into a paid month unless they cancel", async () => {
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    expect(created().payment_method_collection).toBe("always");
  });

  it("collects no card when the owner has turned that requirement off", async () => {
    process.env.STUDENT_PROMO_REQUIRE_CARD = "false";
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    expect(created().payment_method_collection).toBe("if_required");
  });

  it("requires a card for any other value of the setting: only an explicit false turns it off", async () => {
    for (const value of ["true", "", "no", "0", "FALSE "]) {
      h.sessionCreate.mockClear();
      process.env.STUDENT_PROMO_REQUIRE_CARD = value;
      await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
      // "FALSE " is false once trimmed and lowercased; the rest keep the card requirement
      expect(created().payment_method_collection, value).toBe(value.trim().toLowerCase() === "false" ? "if_required" : "always");
    }
  });

  it("is tied to the reservation, so the webhook can record the redemption", async () => {
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    const s = created();
    expect(s.metadata).toMatchObject({ userId: "u1", promo_code: "SCHOOL-CLUB", promo_claim: "claim_1" });
    expect(s.subscription_data.metadata).toMatchObject({ userId: "u1", promo_code: "SCHOOL-CLUB" });
    expect(h.calls.find((c) => c.op === "update" && c.values?.stripe_checkout_session_id === "cs_new")).toBeTruthy();
  });

  it("closes the person's earlier unfinished checkout, so two cannot both complete", async () => {
    h.db.promo_redemptions = (c) =>
      c.op === "select" ? ok({ id: "claim_1", status: "pending", stripe_checkout_session_id: "cs_old" }) : ok();
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    expect(h.sessionExpire).toHaveBeenCalledWith("cs_old");
  });

  it("closes the earlier checkout only after the new one exists", async () => {
    h.db.promo_redemptions = (c) =>
      c.op === "select" ? ok({ id: "claim_1", status: "pending", stripe_checkout_session_id: "cs_old" }) : ok();
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    expect(h.sessionCreate.mock.invocationCallOrder[0]).toBeLessThan(h.sessionExpire.mock.invocationCallOrder[0]);
  });

  it("never closes the session Stripe hands back for a retry of the same request", async () => {
    // Stripe answers a repeat of the same request (same idempotency key) with the original session.
    h.db.promo_redemptions = (c) =>
      c.op === "select" ? ok({ id: "claim_1", status: "pending", stripe_checkout_session_id: "cs_new" }) : ok();
    const url = await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    expect(url).toBe("https://checkout.stripe.test/cs_new");
    expect(h.sessionExpire).not.toHaveBeenCalled();
  });

  it("leaves the earlier checkout open, and still on record, if the new one cannot be made", async () => {
    h.db.promo_redemptions = (c) =>
      c.op === "select" ? ok({ id: "claim_1", status: "pending", stripe_checkout_session_id: "cs_old" }) : ok();
    h.sessionCreate.mockRejectedValue(new Error("Stripe is down"));
    await expect(createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" })).rejects.toThrow(/Stripe is down/);
    expect(h.sessionExpire).not.toHaveBeenCalled();
    const update = h.calls.find((c) => c.op === "update" && c.table === "promo_redemptions")!;
    expect(update.values).not.toHaveProperty("stripe_checkout_session_id");
  });

  it("keeps the affiliate referral alongside, as before", async () => {
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB", endorselyReferral: "ref_1" });
    expect(created().metadata).toMatchObject({ endorsely_referral: "ref_1", promo_claim: "claim_1" });
  });

  it("derives the idempotency key from the request: the same request repeats it, any difference changes it", async () => {
    const minute = (key: string) => key.replace(/_\d+$/, ""); // ignore the clock part: it is the same within a minute
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    process.env.STUDENT_PROMO_REQUIRE_CARD = "false"; // same person, same code, a different setting
    await createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" });
    delete process.env.STUDENT_PROMO_REQUIRE_CARD;
    await createCheckoutSession(base); // no code
    const keys = h.sessionCreate.mock.calls.map((c) => minute(c[1].idempotencyKey));
    expect(keys[0]).toBe(keys[1]);
    expect(new Set([keys[0], keys[2], keys[3]]).size).toBe(3);
  });
});

describe("a student code that is not allowed", () => {
  it("creates nothing for the annual plan: no customer, no reservation, no session", async () => {
    await expect(createCheckoutSession({ ...base, billingInterval: "annual", promoCode: "SCHOOL-CLUB" })).rejects.toThrow(/monthly/);
    expect(h.sessionCreate).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  });

  it("creates nothing for an account without a verified school email", async () => {
    h.db.profiles = () => ok({ edu_verified_at: null });
    await expect(createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" })).rejects.toThrow(/verified school email/);
    expect(h.sessionCreate).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  });

  it("creates nothing for someone who has already redeemed", async () => {
    h.db.promo_redemptions = () => ok({ status: "redeemed" });
    await expect(createCheckoutSession({ ...base, promoCode: "SCHOOL-CLUB" })).rejects.toThrow(/already used/);
    expect(h.sessionCreate).not.toHaveBeenCalled();
  });

  it("creates nothing for a code that does not exist", async () => {
    h.stripeList.mockResolvedValue({ data: [] });
    await expect(createCheckoutSession({ ...base, promoCode: "NOPE" })).rejects.toThrow(/not valid/);
    expect(h.sessionCreate).not.toHaveBeenCalled();
  });
});

describe("a code that is not a student code", () => {
  beforeEach(() => {
    h.stripeList.mockResolvedValue({
      data: [stripeCode({ id: "promo_other", code: "SPRING", promotion: { type: "coupon", coupon: "spring-sale" } })],
    });
  });

  it("is applied for Stripe to judge, and the ordinary trial and card rules stay", async () => {
    await createCheckoutSession({ ...base, billingInterval: "annual", promoCode: "SPRING" });
    const s = created();
    expect(s.discounts).toEqual([{ promotion_code: "promo_other" }]);
    expect(s.subscription_data.trial_period_days).toBe(7);
    expect(s).not.toHaveProperty("payment_method_collection");
    expect(s.metadata).not.toHaveProperty("promo_claim");
    expect(writes()).toHaveLength(0);
  });
});

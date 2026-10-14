import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { Call } from "./helpers/fake-admin";
import { fail, ok } from "./helpers/fake-admin";

// When Stripe says Checkout completed, a student code the server reserved becomes
// a recorded redemption, once, with one analytics event. A checkout that carried
// no reservation records nothing.

const h = vi.hoisted(() => ({
  calls: [] as Call[],
  db: {} as Record<string, (call: Call) => unknown>,
  track: vi.fn(),
  retrieve: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", async () => {
  const { createFakeAdmin: make } = await import("./helpers/fake-admin");
  return {
    createAdminClient: () =>
      make((call) => (h.db[call.table] ? (h.db[call.table](call) as never) : { data: null, error: null }), h.calls),
  };
});
vi.mock("@/lib/stripe/client", () => ({ getStripeClient: () => ({ subscriptions: { retrieve: h.retrieve } }) }));
vi.mock("@/lib/analytics/server", () => ({ trackAnalytics: h.track }));

import { handleStripeEvent } from "@/lib/stripe/webhook-handlers";

const subscription = {
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  cancel_at_period_end: false,
  items: { data: [{ price: { id: "price_monthly", recurring: { interval: "month" } }, current_period_end: 1_800_000_000 }] },
};

const completed = (metadata: Record<string, string>): Stripe.Event =>
  ({
    type: "checkout.session.completed",
    data: { object: { id: "cs_1", subscription: "sub_1", metadata } },
  }) as unknown as Stripe.Event;

const redemptionUpdates = () => h.calls.filter((c) => c.table === "promo_redemptions" && c.op === "update");

beforeEach(() => {
  h.calls.length = 0;
  h.db = { promo_redemptions: () => ok([{ id: "claim_1" }]) };
  h.track.mockReset().mockResolvedValue(undefined);
  h.retrieve.mockReset().mockResolvedValue(subscription);
});

describe("a completed checkout that carried a student code", () => {
  it("records the redemption against the person, and the subscription it started", async () => {
    await handleStripeEvent(completed({ userId: "u1", promo_claim: "claim_1", promo_code: "SCHOOL-CLUB" }));
    const [update] = redemptionUpdates();
    expect(update.values).toMatchObject({ status: "redeemed", stripe_subscription_id: "sub_1" });
    expect(update.filters).toEqual({ id: "claim_1", user_id: "u1", status: "pending" });
  });

  it("records one promo_redeemed event for the person, once however often Stripe resends it", async () => {
    await handleStripeEvent(completed({ userId: "u1", promo_claim: "claim_1" }));
    expect(h.track).toHaveBeenCalledWith("promo_redeemed", { userId: "u1", dedupeKey: "promo_redeemed:u1" });

    h.track.mockClear();
    h.db.promo_redemptions = () => ok([]); // already redeemed: nothing was updated
    await handleStripeEvent(completed({ userId: "u1", promo_claim: "claim_1" }));
    expect(h.track).not.toHaveBeenCalledWith("promo_redeemed", expect.anything());
  });

  it("still starts the subscription, as for any checkout", async () => {
    await handleStripeEvent(completed({ userId: "u1", promo_claim: "claim_1" }));
    expect(h.calls.some((c) => c.table === "subscriptions" && c.op === "update" && c.values?.plan_id === "premium")).toBe(true);
  });

  it("lets a database error out, so Stripe retries instead of the redemption being lost", async () => {
    h.db.promo_redemptions = () => fail("database unavailable");
    await expect(handleStripeEvent(completed({ userId: "u1", promo_claim: "claim_1" }))).rejects.toThrow(/could not record the redemption/);
  });
});

describe("a completed checkout that carried none", () => {
  it("records no redemption and no promo event", async () => {
    await handleStripeEvent(completed({ userId: "u1" }));
    expect(redemptionUpdates()).toHaveLength(0);
    expect(h.track).not.toHaveBeenCalledWith("promo_redeemed", expect.anything());
  });

  it("does nothing about a code for a session with no subscription", async () => {
    const event = completed({ userId: "u1", promo_claim: "claim_1" });
    (event.data.object as unknown as { subscription: null }).subscription = null;
    await handleStripeEvent(event);
    expect(redemptionUpdates()).toHaveLength(0);
  });
});

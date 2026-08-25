import { describe, expect, it } from "vitest";
import { isPremium } from "@/lib/repositories/subscriptions";
import type { Subscription } from "@/types/database";

function makeSubscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: "sub-1",
    userId: "user-1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    status: "none",
    planId: "free",
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("isPremium", () => {
  it("returns false for null subscription", () => {
    expect(isPremium(null)).toBe(false);
  });

  it("returns false for a free plan", () => {
    expect(isPremium(makeSubscription({ planId: "free", status: "none" }))).toBe(false);
  });

  it("returns true for an active premium subscription", () => {
    expect(isPremium(makeSubscription({ planId: "premium", status: "active" }))).toBe(true);
  });

  it("returns true for a trialing premium subscription", () => {
    expect(isPremium(makeSubscription({ planId: "premium", status: "trialing" }))).toBe(true);
  });

  it("returns false for a canceled premium subscription", () => {
    expect(isPremium(makeSubscription({ planId: "premium", status: "canceled" }))).toBe(false);
  });

  it("returns false for a past_due premium subscription", () => {
    expect(isPremium(makeSubscription({ planId: "premium", status: "past_due" }))).toBe(false);
  });
});

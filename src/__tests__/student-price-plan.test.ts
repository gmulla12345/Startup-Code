import { describe, expect, it } from "vitest";
import { priceMatches, studentPriceParams, STUDENT_PRICE_LOOKUP_KEY, toCents } from "@/lib/stripe/student-price-plan";

// The Student plan's Stripe Price, as the script that creates it would make it.

describe("the amount", () => {
  it("is exact in the smallest unit, without floating-point drift", () => {
    expect(19.99 * 100).not.toBe(1999); // the reason toCents exists
    expect(toCents(9.99)).toBe(999);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(10)).toBe(1000);
  });

  it("must be a positive amount", () => {
    for (const bad of [0, -1, NaN]) expect(() => studentPriceParams({ productId: "prod_1", currency: "usd", monthlyAmount: bad })).toThrow();
  });
});

describe("the price", () => {
  const params = studentPriceParams({ productId: "prod_premium", currency: "usd", monthlyAmount: 9.99, taxBehavior: "exclusive" });

  it("is monthly, on the Premium product, in its currency, with its tax behavior, tagged as the student tier", () => {
    expect(params).toEqual({
      product: "prod_premium",
      currency: "usd",
      unit_amount: 999,
      recurring: { interval: "month" },
      lookup_key: STUDENT_PRICE_LOOKUP_KEY,
      nickname: "Student monthly",
      tax_behavior: "exclusive",
      metadata: { tier: "student" },
    });
  });

  it("leaves the tax behavior out when Premium has none set, rather than inventing one", () => {
    for (const none of [null, undefined, "unspecified" as const]) {
      expect(studentPriceParams({ productId: "p", currency: "usd", monthlyAmount: 9.99, taxBehavior: none })).not.toHaveProperty("tax_behavior");
    }
  });

  it("is recognized when it already exists, so running the script twice makes one price", () => {
    const existing = { unit_amount: 999, currency: "usd", recurring: { interval: "month", interval_count: 1 }, product: "prod_premium" };
    expect(priceMatches(existing, params)).toBe(true);
    expect(priceMatches({ ...existing, product: { id: "prod_premium" } }, params)).toBe(true);
  });

  it("is not mistaken for a different price under the same lookup key", () => {
    const existing = { unit_amount: 999, currency: "usd", recurring: { interval: "month", interval_count: 1 }, product: "prod_premium" };
    expect(priceMatches({ ...existing, unit_amount: 1999 }, params)).toBe(false);
    expect(priceMatches({ ...existing, product: "prod_other" }, params)).toBe(false);
    expect(priceMatches({ ...existing, currency: "eur" }, params)).toBe(false);
    expect(priceMatches({ ...existing, recurring: { interval: "year", interval_count: 1 } }, params)).toBe(false);
    expect(priceMatches({ ...existing, recurring: { interval: "month", interval_count: 3 } }, params)).toBe(false);
    expect(priceMatches({ ...existing, recurring: null }, params)).toBe(false);
  });
});

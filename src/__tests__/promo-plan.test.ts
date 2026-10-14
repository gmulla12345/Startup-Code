import { describe, expect, it } from "vitest";
import { expiryTimestamp, planPromoCodes, studentCouponParams } from "@/lib/stripe/promo-plan";
import { STUDENT_COUPON_ID } from "@/lib/config/promo";

// What the bulk-create script would send to Stripe. Tested because it is shown to
// the owner before anything is created, and because the brief's rules live here:
// every code has a limit and an expiry, is for first-time customers, and is named
// <PREFIX>-<NAME>.

const NOW = new Date("2026-10-20T12:00:00Z");
const input = { prefix: "school", names: ["club", "houses"], maxRedemptions: 50, expires: "2027-05-31" };

describe("planning a batch of student codes", () => {
  it("names each code <PREFIX>-<NAME>, uppercased", () => {
    expect(planPromoCodes(input, NOW).map((p) => p.code)).toEqual(["SCHOOL-CLUB", "SCHOOL-HOUSES"]);
  });

  it("gives every code a redemption limit, an expiry, and the first-time-customer restriction", () => {
    for (const { promotionCodeParams: p } of planPromoCodes(input, NOW)) {
      expect(p.max_redemptions).toBe(50);
      expect(p.expires_at).toBe(Math.floor(Date.parse("2027-05-31T23:59:59Z") / 1000));
      expect(p.restrictions).toEqual({ first_time_transaction: true });
    }
  });

  it("points every code at the one student coupon, and marks it as a student code", () => {
    const [first] = planPromoCodes(input, NOW);
    expect(first.promotionCodeParams.promotion).toEqual({ type: "coupon", coupon: STUDENT_COUPON_ID });
    expect(first.promotionCodeParams.metadata).toEqual({ audience: "student", prefix: "SCHOOL", name: "CLUB" });
  });

  it("is not for one customer: a code is shared, so it names no customer", () => {
    const [first] = planPromoCodes(input, NOW);
    expect(first.promotionCodeParams).not.toHaveProperty("customer");
  });

  it("refuses a batch with no limit or a nonsensical one", () => {
    for (const maxRedemptions of [0, -1, 1.5, Number.NaN, 10_001]) {
      expect(() => planPromoCodes({ ...input, maxRedemptions }, NOW), String(maxRedemptions)).toThrow(/Max redemptions/);
    }
  });

  it("refuses an expiry that is missing, malformed, not a real date, in the past, or too far away", () => {
    expect(() => planPromoCodes({ ...input, expires: "" }, NOW)).toThrow(/date like/);
    expect(() => planPromoCodes({ ...input, expires: "31/05/2027" }, NOW)).toThrow(/date like/);
    expect(() => planPromoCodes({ ...input, expires: "2027-02-31" }, NOW)).toThrow(/not a real date/);
    expect(() => planPromoCodes({ ...input, expires: "2026-10-19" }, NOW)).toThrow(/in the past/);
    expect(() => planPromoCodes({ ...input, expires: "2040-01-01" }, NOW)).toThrow(/five years/);
  });

  it("refuses characters Stripe does not allow, empty parts, repeats and long codes", () => {
    expect(() => planPromoCodes({ ...input, prefix: "my school" }, NOW)).toThrow(/Prefix/);
    expect(() => planPromoCodes({ ...input, prefix: "" }, NOW)).toThrow(/Prefix/);
    expect(() => planPromoCodes({ ...input, names: ["a_b"] }, NOW)).toThrow(/Name/);
    expect(() => planPromoCodes({ ...input, names: ["a--b"] }, NOW)).toThrow(/Name/);
    expect(() => planPromoCodes({ ...input, names: [] }, NOW)).toThrow(/at least one/);
    expect(() => planPromoCodes({ ...input, names: ["club", "CLUB"] }, NOW)).toThrow(/twice/);
    expect(() => planPromoCodes({ ...input, names: ["x".repeat(40)] }, NOW)).toThrow(/40 characters/);
  });
});

describe("the expiry", () => {
  it("is the last second of the named day, UTC", () => {
    expect(new Date(expiryTimestamp("2027-05-31") * 1000).toISOString()).toBe("2027-05-31T23:59:59.000Z");
  });
});

describe("the coupon", () => {
  it("is 100% off, once: one free month on a monthly price", () => {
    const coupon = studentCouponParams();
    expect(coupon).toMatchObject({ id: STUDENT_COUPON_ID, percent_off: 100, duration: "once" });
  });

  it("is limited to the Premium product when it is known", () => {
    expect(studentCouponParams("prod_123").applies_to).toEqual({ products: ["prod_123"] });
    expect(studentCouponParams()).not.toHaveProperty("applies_to");
  });
});

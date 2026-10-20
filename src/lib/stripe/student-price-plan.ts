/**
 * What the Student plan's Stripe Price looks like, decided in one place (and tested)
 * so the script that creates it and the code that reads it cannot disagree.
 *
 * It lives on the SAME product as Premium, in the same currency and tax behavior as the
 * monthly Premium price: the student free-month coupon is limited to that product (see
 * studentCouponParams), so a price on any other product would not take it. The lookup
 * key is how the script recognizes a price it already made, so running it twice
 * creates one price, not two.
 */

export const STUDENT_PRICE_LOOKUP_KEY = "zolo_student_monthly";

export interface StudentPriceParams {
  product: string;
  currency: string;
  unit_amount: number;
  recurring: { interval: "month" };
  lookup_key: string;
  nickname: string;
  tax_behavior?: "inclusive" | "exclusive" | "unspecified";
  metadata: { tier: "student" };
}

/** Dollars to the smallest unit, without the floating-point drift (19.99 * 100 is 1998.9999999999998). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function studentPriceParams(input: {
  productId: string;
  currency: string;
  monthlyAmount: number;
  taxBehavior?: "inclusive" | "exclusive" | "unspecified" | null;
}): StudentPriceParams {
  const cents = toCents(input.monthlyAmount);
  if (!Number.isInteger(cents) || cents <= 0) throw new Error(`The student price must be a positive amount, not ${input.monthlyAmount}.`);
  return {
    product: input.productId,
    currency: input.currency,
    unit_amount: cents,
    recurring: { interval: "month" },
    lookup_key: STUDENT_PRICE_LOOKUP_KEY,
    nickname: "Student monthly",
    ...(input.taxBehavior && input.taxBehavior !== "unspecified" ? { tax_behavior: input.taxBehavior } : {}),
    metadata: { tier: "student" },
  };
}

/** Whether a price Stripe already holds under our lookup key is the one we would make. */
export function priceMatches(
  existing: { unit_amount: number | null; currency: string; recurring: { interval: string; interval_count: number } | null; product: string | { id: string } },
  wanted: StudentPriceParams
): boolean {
  const product = typeof existing.product === "string" ? existing.product : existing.product.id;
  return (
    product === wanted.product &&
    existing.unit_amount === wanted.unit_amount &&
    existing.currency === wanted.currency &&
    existing.recurring?.interval === "month" &&
    existing.recurring?.interval_count === 1
  );
}

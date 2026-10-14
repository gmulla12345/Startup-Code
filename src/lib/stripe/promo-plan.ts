import { STUDENT_COUPON_ID } from "@/lib/config/promo";

/**
 * Plans a batch of student promotion codes without touching Stripe: the script
 * (scripts/create-promo-codes.ts) prints this plan first, and only a separate
 * --apply sends it. Pure, so the rules are tested and the dry run is exactly
 * what the real run would send.
 *
 * The rules are the brief's: every code has a redemption limit and an expiry
 * (neither has a default; a batch without them is refused), is first-time-customers
 * only, and is named <PREFIX>-<NAME>.
 */

export interface PromoBatchInput {
  prefix: string;
  names: string[];
  maxRedemptions: number;
  /** Date only (YYYY-MM-DD); the code stops working at the end of that day, UTC. */
  expires: string;
}

export interface PlannedPromoCode {
  code: string;
  promotionCodeParams: {
    promotion: { type: "coupon"; coupon: string };
    code: string;
    max_redemptions: number;
    expires_at: number;
    restrictions: { first_time_transaction: true };
    metadata: { audience: "student"; prefix: string; name: string };
  };
}

export const MAX_REDEMPTIONS_CEILING = 10_000;
const PART = /^[A-Z0-9]+(-[A-Z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** The instant a code stops working: the last second of the given day, UTC. */
export function expiryTimestamp(expires: string): number {
  if (!DATE.test(expires)) throw new Error(`Expiry must be a date like 2027-05-31, not "${expires}".`);
  const ms = Date.parse(`${expires}T23:59:59Z`);
  if (!Number.isFinite(ms)) throw new Error(`"${expires}" is not a real date.`);
  // Date.parse rolls 2027-02-31 forward; make sure the day survived the round trip.
  if (new Date(ms).toISOString().slice(0, 10) !== expires) throw new Error(`"${expires}" is not a real date.`);
  return Math.floor(ms / 1000);
}

/** Uppercases and checks one part of a code. */
function part(label: string, raw: string): string {
  const value = raw.trim().toUpperCase();
  if (!PART.test(value)) {
    throw new Error(`${label} "${raw}" may only use letters, numbers and single hyphens.`);
  }
  return value;
}

export function planPromoCodes(input: PromoBatchInput, now: Date = new Date()): PlannedPromoCode[] {
  const prefix = part("Prefix", input.prefix);

  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1 || input.maxRedemptions > MAX_REDEMPTIONS_CEILING) {
    throw new Error(`Max redemptions must be a whole number from 1 to ${MAX_REDEMPTIONS_CEILING}.`);
  }

  const expiresAt = expiryTimestamp(input.expires);
  if (expiresAt * 1000 <= now.getTime()) throw new Error(`Expiry ${input.expires} is in the past.`);
  if (expiresAt * 1000 - now.getTime() > 5 * 365 * DAY_MS) throw new Error("Expiry is more than five years away.");

  if (input.names.length === 0) throw new Error("Give at least one name.");

  const seen = new Set<string>();
  return input.names.map((raw) => {
    const name = part("Name", raw);
    const code = `${prefix}-${name}`;
    if (code.length > 40) throw new Error(`"${code}" is longer than 40 characters.`);
    if (seen.has(code)) throw new Error(`"${code}" appears twice.`);
    seen.add(code);
    return {
      code,
      promotionCodeParams: {
        promotion: { type: "coupon" as const, coupon: STUDENT_COUPON_ID },
        code,
        max_redemptions: input.maxRedemptions,
        expires_at: expiresAt,
        restrictions: { first_time_transaction: true as const },
        metadata: { audience: "student" as const, prefix, name },
      },
    };
  });
}

/** The one coupon every code points at: 100% off, once. */
export function studentCouponParams(premiumProductId?: string) {
  return {
    id: STUDENT_COUPON_ID,
    name: "Student free month",
    percent_off: 100,
    duration: "once" as const,
    ...(premiumProductId ? { applies_to: { products: [premiumProductId] } } : {}),
    metadata: { audience: "student" },
  };
}

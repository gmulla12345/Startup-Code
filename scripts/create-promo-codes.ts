import "./load-env";
import { parseArgs } from "node:util";
import { planPromoCodes, studentCouponParams } from "../src/lib/stripe/promo-plan";
import { STUDENT_COUPON_ID } from "../src/lib/config/promo";
import { premiumPriceId } from "../src/lib/config/pricing";

/**
 * Creates student promo codes in Stripe: <PREFIX>-<NAME>, each worth one free
 * month of Premium, each with a redemption limit and an expiry, first-time
 * customers only.
 *
 *   npm run promo-codes -- --prefix <SCHOOL> --names <A>,<B>,<C> --max 100 --expires 2027-05-31
 *
 * That is a DRY RUN: it prints exactly what it would send and sends nothing (no
 * network call at all). Add --apply to create them.
 *
 *   --prefix    the school, e.g. the part before the hyphen in <SCHOOL>-<NAME>
 *   --names     comma-separated names; one code each
 *   --max       how many times each code can be redeemed (required, no default)
 *   --expires   last day each code works, YYYY-MM-DD, UTC (required, no default)
 *   --apply     really create them
 *   --yes-live  also required when STRIPE_SECRET_KEY is a live key
 *
 * Safe to run twice: the coupon and any code that already exists are left alone.
 * The coupon is shared by every student code; the server recognizes a student
 * code by it (see src/lib/stripe/promo.ts), so never point another code at it.
 *
 * Which Stripe account this reaches is decided by STRIPE_SECRET_KEY. .env.local
 * holds a test key; for the live account run with the live key in the
 * environment for that one command, and with --yes-live.
 */

const { values } = parseArgs({
  options: {
    prefix: { type: "string" },
    names: { type: "string" },
    max: { type: "string" },
    expires: { type: "string" },
    apply: { type: "boolean", default: false },
    "yes-live": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function main() {
  if (!values.prefix || !values.names || !values.max || !values.expires) {
    fail("Needs --prefix, --names, --max and --expires. See the comment at the top of scripts/create-promo-codes.ts.");
  }

  let plan;
  try {
    plan = planPromoCodes({
      prefix: values.prefix,
      names: values.names.split(",").filter((n) => n.trim() !== ""),
      maxRedemptions: Number(values.max),
      expires: values.expires,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }

  const coupon = studentCouponParams("<the Premium product, read from the monthly price>");
  console.log(`\nThe coupon (created once, shared by every student code; skipped if it exists):\n`);
  console.log(JSON.stringify(coupon, null, 2));
  console.log(`\nThe promotion codes (${plan.length}):\n`);
  for (const p of plan) console.log(JSON.stringify(p.promotionCodeParams, null, 2));
  const first = plan[0].promotionCodeParams;
  console.log(
    `\n${plan.length} code(s), each redeemable ${first.max_redemptions} time(s), expiring ${new Date(first.expires_at * 1000).toISOString()}.`
  );

  if (!values.apply) {
    console.log("\nDry run. Nothing was sent to Stripe. Run again with --apply to create these.\n");
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) fail("STRIPE_SECRET_KEY is not set.");
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (live && !values["yes-live"]) fail("STRIPE_SECRET_KEY is a LIVE key. Add --yes-live if you mean to create these in the live account.");
  console.log(`\nStripe mode: ${live ? "LIVE" : "TEST"}\n`);

  // Imported here so a dry run never loads the Stripe client.
  const { getStripeClient } = await import("../src/lib/stripe/client");
  const stripe = getStripeClient();

  // The coupon: 100% off, once. Restricted to the Premium product when we can tell which it is.
  let productId: string | undefined;
  const monthlyPrice = premiumPriceId("monthly");
  if (monthlyPrice) {
    const price = await stripe.prices.retrieve(monthlyPrice);
    productId = typeof price.product === "string" ? price.product : price.product.id;
  } else {
    console.warn("NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID is not set: the coupon will not be limited to the Premium product.");
  }

  try {
    const existing = await stripe.coupons.retrieve(STUDENT_COUPON_ID);
    if (existing.percent_off !== 100 || existing.duration !== "once") {
      fail(`The coupon "${STUDENT_COUPON_ID}" already exists but is not 100% off once. Not touching it.`);
    }
    console.log(`coupon ${STUDENT_COUPON_ID}: already exists`);
  } catch (err) {
    if ((err as { code?: string }).code !== "resource_missing") throw err;
    await stripe.coupons.create(studentCouponParams(productId));
    console.log(`coupon ${STUDENT_COUPON_ID}: created`);
  }

  for (const p of plan) {
    const found = await stripe.promotionCodes.list({ code: p.code, limit: 1 });
    if (found.data.length > 0) {
      console.log(`${p.code}: already exists (${found.data[0].id}), left alone`);
      continue;
    }
    const created = await stripe.promotionCodes.create(p.promotionCodeParams);
    console.log(`${p.code}: created (${created.id})`);
  }
  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

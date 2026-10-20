import "./load-env";
import { parseArgs } from "node:util";
import { premiumPriceId, studentPricing } from "../src/lib/config/pricing";
import { priceMatches, studentPriceParams, STUDENT_PRICE_LOOKUP_KEY, toCents } from "../src/lib/stripe/student-price-plan";

/**
 * Creates the Student plan's Stripe Price: Premium at the student monthly price, on the
 * SAME product as Premium (the student free-month coupon is limited to that product).
 *
 *   npm run student-price
 *
 * That is a DRY RUN: it prints what it would create and sends nothing (no network call).
 * Add --apply to create it.
 *
 *   --apply     really create it
 *   --yes-live  also required when STRIPE_SECRET_KEY is a live key
 *
 * The amount is NEXT_PUBLIC_STUDENT_PRICE (default 9.99); the product, currency and tax
 * behavior are read from the monthly Premium price (NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID).
 * Safe to run twice: a price already made under the lookup key is left alone (and refused
 * if it is not the price this would make). When it finishes it prints the one line to put
 * in Vercel; the Student plan appears on the site only after that is set and the site is
 * redeployed.
 *
 * Which Stripe account this reaches is decided by STRIPE_SECRET_KEY. .env.local holds a
 * TEST key; for the live account run with the live key in the environment for that one
 * command, and with --yes-live.
 */

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    "yes-live": { type: "boolean", default: false },
  },
});

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

async function main() {
  const monthly = premiumPriceId("monthly");
  if (!monthly) fail("NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID is not set, so the Premium product cannot be found.");

  console.log(`\nThe Student price (created once, found again by its lookup key "${STUDENT_PRICE_LOOKUP_KEY}"):\n`);
  console.log(
    JSON.stringify(
      {
        product: "<the product of the monthly Premium price>",
        currency: "<the currency of the monthly Premium price>",
        unit_amount: toCents(studentPricing.priceMonthly),
        recurring: { interval: "month" },
        lookup_key: STUDENT_PRICE_LOOKUP_KEY,
        nickname: "Student monthly",
        tax_behavior: "<the tax behavior of the monthly Premium price>",
        metadata: { tier: "student" },
      },
      null,
      2
    )
  );

  if (!values.apply) {
    console.log("\nDry run. Nothing was sent to Stripe. Run again with --apply to create it.\n");
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) fail("STRIPE_SECRET_KEY is not set.");
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  if (live && !values["yes-live"]) fail("STRIPE_SECRET_KEY is a LIVE key. Add --yes-live if you mean to create this in the live account.");
  console.log(`\nStripe mode: ${live ? "LIVE" : "TEST"}\n`);

  // Imported here so a dry run never loads the Stripe client.
  const { getStripeClient } = await import("../src/lib/stripe/client");
  const stripe = getStripeClient();

  const premium = await stripe.prices.retrieve(monthly);
  const productId = typeof premium.product === "string" ? premium.product : premium.product.id;
  const wanted = studentPriceParams({
    productId,
    currency: premium.currency,
    monthlyAmount: studentPricing.priceMonthly,
    taxBehavior: premium.tax_behavior,
  });

  const found = await stripe.prices.list({ lookup_keys: [STUDENT_PRICE_LOOKUP_KEY], limit: 1 });
  let priceId: string;
  if (found.data.length > 0) {
    const existing = found.data[0];
    if (!priceMatches(existing, wanted)) {
      fail(`A price already exists under the lookup key "${STUDENT_PRICE_LOOKUP_KEY}" (${existing.id}) but it is not the one this would make. Not touching it.`);
    }
    priceId = existing.id;
    console.log(`price ${priceId}: already exists, left alone`);
  } else {
    const created = await stripe.prices.create(wanted);
    priceId = created.id;
    console.log(`price ${priceId}: created`);
  }

  console.log(`\nTo turn the Student plan on, set this in Vercel (Production), then redeploy:\n\n  NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ID=${priceId}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

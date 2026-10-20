import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { isStripeConfigured } from "@/lib/stripe/client";
import { checkoutRequestSchema } from "@/lib/validation/schemas";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    if (!isStripeConfigured()) {
      throw new ApiError(503, "Billing isn't configured yet. Add STRIPE_SECRET_KEY to enable it.");
    }

    const { user } = await requireUser();
    if (!user.email) throw new ApiError(400, "Your account needs a verified email to subscribe.");

    // Body is optional (older cached clients may POST with none) — an
    // empty/missing body just falls through to the "monthly" default.
    const rawBody = await request.text();
    const { billingInterval, plan, endorselyReferral, promoCode } = checkoutRequestSchema.parse(
      rawBody ? JSON.parse(rawBody) : {}
    );

    // Trying codes is capped per account, so a code cannot be found by guessing.
    if (promoCode) checkRateLimit(`promo:${user.id}`, 8, 10 * 60_000);

    const origin = new URL(request.url).origin;
    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      successUrl: `${origin}/profile?checkout=success`,
      cancelUrl: `${origin}/profile?checkout=cancelled`,
      billingInterval,
      plan,
      endorselyReferral,
      promoCode,
    });

    return NextResponse.json({ url });
  });
}

import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { isStripeConfigured } from "@/lib/stripe/client";

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    if (!isStripeConfigured()) {
      throw new ApiError(503, "Billing isn't configured yet. Add STRIPE_SECRET_KEY to enable it.");
    }

    const { user } = await requireUser();
    if (!user.email) throw new ApiError(400, "Your account needs a verified email to subscribe.");

    const origin = new URL(request.url).origin;
    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      successUrl: `${origin}/profile?checkout=success`,
      cancelUrl: `${origin}/profile?checkout=cancelled`,
    });

    return NextResponse.json({ url });
  });
}

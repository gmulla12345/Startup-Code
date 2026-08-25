import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { createPortalSession } from "@/lib/stripe/checkout";
import { isStripeConfigured } from "@/lib/stripe/client";

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    if (!isStripeConfigured()) {
      throw new ApiError(503, "Billing isn't configured yet. Add STRIPE_SECRET_KEY to enable it.");
    }

    const { user } = await requireUser();
    const origin = new URL(request.url).origin;

    const url = await createPortalSession({
      userId: user.id,
      returnUrl: `${origin}/profile`,
    });

    return NextResponse.json({ url });
  });
}

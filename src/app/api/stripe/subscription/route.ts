import { NextResponse } from "next/server";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { isStripeConfigured } from "@/lib/stripe/client";
import { cancelAtPeriodEnd, keepPremium, pauseForMonth, switchToStudent, undoPause } from "@/lib/stripe/cancel-flow";
import { subscriptionActionSchema } from "@/lib/validation/schemas";

/**
 * What a Premium subscriber may do instead of cancelling, and cancelling. One action per request, on the caller's own
 * subscription only (it is found from who they are, never from the request). The cancel screen at /profile/cancel calls
 * this; so can the mobile app, with a bearer token.
 *
 *   { "action": "student" | "pause" | "cancel" | "keep" | "unpause" }
 */
const LIMIT = { max: 10, windowMs: 60_000 } as const;

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    if (!isStripeConfigured()) throw new ApiError(503, "Billing isn't configured yet.");
    const { user } = await requireUser();
    checkRateLimit(`subscription:${user.id}`, LIMIT.max, LIMIT.windowMs);

    const { action } = subscriptionActionSchema.parse(await request.json().catch(() => null));
    switch (action) {
      case "student":
        return NextResponse.json({ action, ...(await switchToStudent(user.id)) });
      case "pause":
        return NextResponse.json({ action, ...(await pauseForMonth(user.id)) });
      case "unpause":
        await undoPause(user.id);
        return NextResponse.json({ action });
      case "cancel":
        return NextResponse.json({ action, ...(await cancelAtPeriodEnd(user.id)) });
      case "keep":
        await keepPremium(user.id);
        return NextResponse.json({ action });
    }
  });
}

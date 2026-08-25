import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { trackEvent, getRecentEvents } from "@/lib/repositories/events";
import { getSurpriseMe } from "@/services/recommendation/engine";
import { FREE_TIER_LIMITS } from "@/lib/config/pricing";
import { surpriseMeFeedbackSchema } from "@/lib/validation/schemas";

async function assertWithinFreeLimit(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, premium: boolean) {
  if (premium) return;
  const events = await getRecentEvents(supabase, userId, 200);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentRequests = events.filter(
    (e) => e.eventType === "surprise_me_requested" && new Date(e.createdAt).getTime() > oneWeekAgo
  );
  if (recentRequests.length >= FREE_TIER_LIMITS.surpriseMePerWeek) {
    throw new ApiError(402, "You've used your free Surprise Me for this week. Upgrade to Premium for unlimited.");
  }
}

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    checkRateLimit(`surprise-me:${user.id}`, 20, 60_000);

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) throw new ApiError(404, "Profile not found.");
    if (!profile.onboardingCompleted) throw new ApiError(400, "Finish onboarding first.");

    const subscription = await getSubscription(supabase, user.id);
    const premium = isPremium(subscription);
    await assertWithinFreeLimit(supabase, user.id, premium);

    const url = new URL(request.url);
    const excludeIds = (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean);

    const result = await getSurpriseMe(supabase, profile, excludeIds);
    if (!result) {
      return NextResponse.json({ result: null, message: "No matching experiences yet — try widening your interests in Profile." });
    }

    await trackEvent(supabase, user.id, "surprise_me_requested", result.experience.id);
    return NextResponse.json({ result });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = surpriseMeFeedbackSchema.parse(await request.json());

    await trackEvent(supabase, user.id, "surprise_me_feedback", body.experienceId, {
      feedback: body.feedback,
    });

    if (body.feedback === "lets_go") {
      await trackEvent(supabase, user.id, "clicked_booking", body.experienceId);
      return NextResponse.json({ ok: true });
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) throw new ApiError(404, "Profile not found.");

    const nextExcludeIds = [...body.excludeIds, body.experienceId];
    const result = await getSurpriseMe(supabase, profile, nextExcludeIds);

    return NextResponse.json({ result });
  });
}

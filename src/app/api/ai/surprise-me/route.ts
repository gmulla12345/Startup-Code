import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { trackEvent, countEventsSince } from "@/lib/repositories/events";
import { getSurpriseMe } from "@/services/recommendation/engine";
import { FREE_TIER_LIMITS } from "@/lib/config/pricing";
import { surpriseMeFeedbackSchema } from "@/lib/validation/schemas";
import { usageContext } from "@/lib/usage/context";
import { assertWithinLimit } from "@/lib/usage/limits";
import { trackAnalytics } from "@/lib/analytics/server";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

async function assertWithinFreeLimit(supabase: Supabase, userId: string, premium: boolean) {
  if (premium) return;
  const used = await countEventsSince(supabase, userId, "surprise_me_requested", new Date(Date.now() - WEEK_MS).toISOString());
  if (used >= FREE_TIER_LIMITS.surpriseMePerWeek) {
    throw new ApiError(402, "You've used your free Surprise Me for this week. Upgrade to Premium for unlimited.");
  }
}

/**
 * "Not for me" fetches another pick, which costs a Claude call and a Places
 * lookup exactly like the first one. Free accounts get a small number of
 * replacements a week (FREE_TIER_LIMITS.surpriseMeRerollsPerWeek); counting
 * happens in the database from the feedback events this route records, so a
 * client cannot reset it by sending a different excludeIds list.
 */
async function countRerollsThisWeek(supabase: Supabase, userId: string): Promise<number> {
  return countEventsSince(supabase, userId, "surprise_me_feedback", new Date(Date.now() - WEEK_MS).toISOString(), {
    key: "feedback",
    value: "not_for_me",
  });
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

    const usage = usageContext(user.id, "surprise_me");
    await assertWithinLimit(usage, "places");

    const url = new URL(request.url);
    const excludeIds = (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean);

    const result = await getSurpriseMe(supabase, profile, excludeIds, usage);
    if (!result) {
      return NextResponse.json({ result: null, message: "No matching experiences yet — try widening your interests in Profile." });
    }

    await trackEvent(supabase, user.id, "surprise_me_requested", result.experience.id);
    await trackAnalytics("surprise_me_used", { userId: user.id, props: { reroll: false } });
    return NextResponse.json({ result });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    // The same per-minute cap as GET. This path used to have none, and it
    // does the expensive part (a fresh pick) on every "not for me".
    checkRateLimit(`surprise-me:${user.id}`, 20, 60_000);

    const body = surpriseMeFeedbackSchema.parse(await request.json());

    // Decide the allowance BEFORE recording this feedback, so the event being
    // recorded now does not count against itself. Premium is never blocked here
    // (it is bounded by the daily limits instead).
    let rerollBlocked = false;
    if (body.feedback === "not_for_me" && !isPremium(await getSubscription(supabase, user.id))) {
      rerollBlocked = (await countRerollsThisWeek(supabase, user.id)) >= FREE_TIER_LIMITS.surpriseMeRerollsPerWeek;
    }

    // The learning signal is recorded regardless: a "not for me" teaches the
    // taste model even when it is not followed by a new pick.
    await trackEvent(supabase, user.id, "surprise_me_feedback", body.experienceId, {
      feedback: body.feedback,
      tags: body.tags,
      category: body.category,
    });

    if (body.feedback === "lets_go") {
      await trackEvent(supabase, user.id, "clicked_booking", body.experienceId);
      return NextResponse.json({ ok: true });
    }

    if (rerollBlocked) {
      throw new ApiError(402, "You've used this week's free alternatives. Upgrade to Premium for unlimited.");
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) throw new ApiError(404, "Profile not found.");

    const usage = usageContext(user.id, "surprise_me");
    await assertWithinLimit(usage, "places");

    const nextExcludeIds = [...body.excludeIds, body.experienceId];
    const result = await getSurpriseMe(supabase, profile, nextExcludeIds, usage);
    if (result) await trackAnalytics("surprise_me_used", { userId: user.id, props: { reroll: true } });

    return NextResponse.json({ result });
  });
}

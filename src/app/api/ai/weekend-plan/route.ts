import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { getExperienceProvider } from "@/services/providers";
import { generateWeekendPlan } from "@/ai/weekend-plan";
import { weekendPlanRequestSchema } from "@/lib/validation/schemas";
import { FREE_TIER_LIMITS } from "@/lib/config/pricing";

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    checkRateLimit(`weekend-plan:${user.id}`, 10, 60_000);

    const subscription = await getSubscription(supabase, user.id);
    if (!isPremium(subscription) && !FREE_TIER_LIMITS.weekendPlannerEnabled) {
      throw new ApiError(402, "The AI Weekend Planner is a Premium feature.");
    }

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) throw new ApiError(404, "Profile not found.");

    const body = weekendPlanRequestSchema.parse(await request.json());

    const provider = await getExperienceProvider();
    const candidates = await provider.list({
      city: profile.city ?? undefined,
      latitude: profile.latitude ?? undefined,
      longitude: profile.longitude ?? undefined,
      radiusMiles: profile.preferences.maxDistanceMiles * 4,
      tags: body.interests.length > 0 ? body.interests : profile.interests,
      socialMode: body.socialMode,
      limit: 30,
    });

    const plan = await generateWeekendPlan(profile, body, candidates);
    return NextResponse.json({ plan });
  });
}

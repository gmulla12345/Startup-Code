import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { getRecommendations } from "@/services/recommendation/engine";
import { FREE_TIER_LIMITS } from "@/lib/config/pricing";

const SURFACE_CONTEXTS = ["for_you", "nearby", "weekend", "hidden_gem", "because_you_like"] as const;

export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    checkRateLimit(`recommendations:${user.id}`, 30, 60_000);

    const url = new URL(request.url);
    const surfaceParam = url.searchParams.get("surface") ?? "for_you";
    const surfaceContext = (SURFACE_CONTEXTS as readonly string[]).includes(surfaceParam)
      ? (surfaceParam as (typeof SURFACE_CONTEXTS)[number])
      : "for_you";
    const limit = Number(url.searchParams.get("limit") ?? 10);

    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) throw new ApiError(404, "Profile not found.");
    if (!profile.onboardingCompleted) {
      return NextResponse.json({ recommendations: [], needsOnboarding: true });
    }

    const subscription = await getSubscription(supabase, user.id);
    const premium = isPremium(subscription);
    const effectiveLimit = premium ? limit : Math.min(limit, FREE_TIER_LIMITS.recommendationsPerWeek);

    const recommendations = await getRecommendations(supabase, profile, {
      surfaceContext,
      limit: effectiveLimit,
      useAI: true,
    });

    return NextResponse.json({ recommendations, premium });
  });
}

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

    // useAI: false — same fix as Home (see home/page.tsx): this route backs
    // Discover's "Personalized" sort, which is the *default* view for a
    // logged-in visitor, so it was hitting the identical non-streamed,
    // multi-second AI reasoning call on every load. Deterministic reasoning
    // is accurate now that Experience.tags are real (see the taste-learning
    // fix), so this is a real speed win, not a quality downgrade.
    const recommendations = await getRecommendations(supabase, profile, {
      surfaceContext,
      limit: effectiveLimit,
      useAI: false,
    });

    return NextResponse.json({ recommendations, premium });
  });
}

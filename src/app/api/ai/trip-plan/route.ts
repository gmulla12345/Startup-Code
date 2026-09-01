import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { getExperienceProvider } from "@/services/providers";
import { generateTripPlan } from "@/ai/trip-plan";
import { saveTripPlanAsItinerary } from "@/lib/repositories/itineraries";
import { tripPlanRequestSchema } from "@/lib/validation/schemas";
import { isAIConfigured } from "@/ai/client";

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    checkRateLimit(`trip-plan:${user.id}`, 5, 60_000);

    const subscription = await getSubscription(supabase, user.id);
    if (!isPremium(subscription)) {
      throw new ApiError(402, "The AI Trip Planner is a Premium feature.");
    }
    if (!isAIConfigured()) {
      throw new ApiError(503, "Trip planning isn't available right now — try again shortly.");
    }

    const body = tripPlanRequestSchema.parse(await request.json());

    const provider = await getExperienceProvider();
    const candidates = await provider.list({
      city: body.destinationCity,
      latitude: body.destinationLatitude,
      longitude: body.destinationLongitude,
      radiusMiles: 20,
      tags: body.interests.length > 0 ? body.interests : undefined,
      socialMode: body.socialMode,
      limit: 60,
    });

    const plan = await generateTripPlan(body, candidates);
    if (!plan) {
      throw new ApiError(422, "Couldn't build a plan for those dates — try again or widen your interests.");
    }

    const { itinerary } = await saveTripPlanAsItinerary(
      supabase,
      user.id,
      `Trip to ${body.destinationCity}`,
      plan,
      { startDate: body.startDate, endDate: body.endDate }
    );

    return NextResponse.json({ itineraryId: itinerary.id });
  });
}

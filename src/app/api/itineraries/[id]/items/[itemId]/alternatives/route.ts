import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { getItineraryWithItems, getSwapCandidates } from "@/lib/repositories/itineraries";

/**
 * Real alternatives near an itinerary's destination for swapping out one
 * item — never AI-generated, just the same live Google Places data the rest
 * of the catalog uses, filtered to exclude places already in the plan.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await context.params;
    const { user, supabase } = await requireUser();

    const result = await getItineraryWithItems(supabase, id);
    if (!result || result.itinerary.userId !== user.id) throw new ApiError(404, "Itinerary not found.");

    const { itinerary, items } = result;
    if (itinerary.destinationLatitude == null || itinerary.destinationLongitude == null) {
      throw new ApiError(400, "Swapping isn't available for this itinerary.");
    }

    const excludeIds = items.map((i) => i.experienceId).filter((id): id is string => Boolean(id));
    const alternatives = await getSwapCandidates(itinerary, excludeIds);

    return NextResponse.json({ alternatives });
  });
}

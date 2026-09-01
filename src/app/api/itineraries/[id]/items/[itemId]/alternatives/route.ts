import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { getItineraryWithItems } from "@/lib/repositories/itineraries";
import { getExperienceProvider } from "@/services/providers";

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

    const provider = await getExperienceProvider();
    const candidates = await provider.list({
      city: itinerary.destinationCity ?? undefined,
      latitude: itinerary.destinationLatitude,
      longitude: itinerary.destinationLongitude,
      radiusMiles: 20,
      excludeIds,
      limit: 12,
    });

    const alternatives = candidates.map((c) => ({
      experienceId: c.id,
      title: c.title,
      category: c.category,
      images: c.images.slice(0, 3),
      priceEstimate: c.priceEstimate,
      priceLevel: c.priceLevel,
      rating: c.rating,
      shortDescription: c.shortDescription,
    }));

    return NextResponse.json({ alternatives });
  });
}

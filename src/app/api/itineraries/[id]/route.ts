import { NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { getItineraryWithItems } from "@/lib/repositories/itineraries";

/**
 * Reads one of the caller's own itineraries (row-level security: the owner only).
 * Sharing a plan is not done here: it goes through /api/shares, which makes an
 * unguessable link the owner can turn off.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await context.params;
    const supabase = await createClient();

    const result = await getItineraryWithItems(supabase, id);
    if (!result) throw new ApiError(404, "Itinerary not found.");

    return NextResponse.json(result);
  });
}

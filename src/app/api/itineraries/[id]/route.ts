import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { getItineraryWithItems } from "@/lib/repositories/itineraries";

/**
 * Public-readable if the itinerary is marked shareable (is_public via RLS
 * policy) — powers the itinerary share page without requiring the viewer
 * to be signed in.
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

/** Marks an itinerary shareable (public read-only via its share link). */
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await context.params;
    const { user, supabase } = await requireUser();

    const { data, error } = await supabase
      .from("itineraries")
      .update({ is_public: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("share_slug")
      .single();

    if (error) throw new ApiError(404, "Itinerary not found.");
    return NextResponse.json({ shareSlug: data.share_slug });
  });
}

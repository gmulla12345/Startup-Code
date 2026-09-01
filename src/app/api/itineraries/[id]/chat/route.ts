import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getItineraryWithItems, getSwapCandidates, deleteItineraryItem, updateItineraryItem } from "@/lib/repositories/itineraries";
import { interpretItineraryChat, pickSwapCandidate } from "@/ai/itinerary-chat";
import { isAIConfigured } from "@/ai/client";

const chatRequestSchema = z.object({ message: z.string().min(1).max(500) });

/**
 * Free-form chat editing for an itinerary — the third way to change an
 * activity, alongside the click-to-swap picker and Remove button in
 * itinerary-detail.tsx. Deliberately reuses the exact same mutation
 * primitives (updateItineraryItem / deleteItineraryItem) and the exact same
 * real-candidate source (getSwapCandidates) as the picker: the AI here only
 * decides *which item* and *picks from real options*, it never invents a
 * place, price, or description on its own.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const { id } = await context.params;
    const { user, supabase } = await requireUser();
    checkRateLimit(`itinerary-chat:${user.id}`, 20, 60_000);

    if (!isAIConfigured()) {
      throw new ApiError(503, "Chat editing isn't available right now — try the swap/remove buttons instead.");
    }

    const body = chatRequestSchema.parse(await request.json());

    const result = await getItineraryWithItems(supabase, id);
    if (!result || result.itinerary.userId !== user.id) throw new ApiError(404, "Itinerary not found.");
    const { itinerary, items } = result;

    if (items.length === 0) {
      return NextResponse.json({ reply: "This itinerary doesn't have any activities to edit yet." });
    }

    const intent = await interpretItineraryChat(body.message, itinerary, items);
    if (!intent || intent.action === "clarify" || !intent.itemId) {
      return NextResponse.json({
        reply: intent?.reply ?? "I couldn't quite understand that — try naming the day or activity directly.",
      });
    }

    const targetItem = items.find((i) => i.id === intent.itemId);
    if (!targetItem) {
      return NextResponse.json({ reply: "I couldn't find that item in your itinerary." });
    }

    if (intent.action === "remove") {
      await deleteItineraryItem(supabase, id, targetItem.id, user.id);
      return NextResponse.json({ reply: intent.reply, removed: true, itemId: targetItem.id });
    }

    // action === "swap"
    if (itinerary.destinationLatitude == null || itinerary.destinationLongitude == null) {
      return NextResponse.json({ reply: "Swapping isn't available for this itinerary yet." });
    }

    const excludeIds = items.map((i) => i.experienceId).filter((eid): eid is string => Boolean(eid));
    const candidates = await getSwapCandidates(itinerary, excludeIds);
    if (candidates.length === 0) {
      return NextResponse.json({ reply: "I couldn't find any real alternatives nearby right now." });
    }

    const pick = await pickSwapCandidate(intent.preference ?? body.message, candidates);
    if (!pick?.experienceId) {
      return NextResponse.json({
        reply: pick?.reply ?? "Nothing nearby matched what you're looking for — try being more specific.",
      });
    }
    const chosen = candidates.find((c) => c.experienceId === pick.experienceId);
    if (!chosen) {
      return NextResponse.json({ reply: "Something went wrong picking a replacement — try again." });
    }

    const updated = await updateItineraryItem(supabase, id, targetItem.id, user.id, {
      experienceId: chosen.experienceId,
      title: chosen.title,
      notes: chosen.shortDescription,
      estimatedCost: chosen.priceEstimate,
      images: chosen.images,
    });

    return NextResponse.json({ reply: pick.reply, item: updated });
  });
}

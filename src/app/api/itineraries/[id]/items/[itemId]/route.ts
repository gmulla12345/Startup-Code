import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { deleteItineraryItem, updateItineraryItem } from "@/lib/repositories/itineraries";

const swapItemSchema = z.object({
  experienceId: z.string().nullable(),
  title: z.string().min(1).max(200),
  notes: z.string().nullable(),
  estimatedCost: z.number().nullable(),
  images: z.array(z.string()).default([]),
});

/** Swaps an item's content in place (used by the click-to-swap picker). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  return withErrorHandling(async () => {
    const { id, itemId } = await context.params;
    const { user, supabase } = await requireUser();
    const body = swapItemSchema.parse(await request.json());

    const item = await updateItineraryItem(supabase, id, itemId, user.id, body);
    return NextResponse.json({ item });
  });
}

/** Removes an item entirely ("no event instead"). */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  return withErrorHandling(async () => {
    const { id, itemId } = await context.params;
    const { user, supabase } = await requireUser();

    await deleteItineraryItem(supabase, id, itemId, user.id);
    return NextResponse.json({ ok: true });
  });
}

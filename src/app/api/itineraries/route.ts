import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { listItineraries, saveWeekendPlanAsItinerary } from "@/lib/repositories/itineraries";
import { z } from "zod";

const saveItinerarySchema = z.object({
  title: z.string().min(1).max(100),
  plan: z.object({
    items: z.array(
      z.object({
        day: z.string(),
        startTime: z.string(),
        title: z.string(),
        experienceId: z.string().nullable(),
        estimatedCost: z.number().nullable(),
        notes: z.string(),
      })
    ),
    totalEstimatedCost: z.number(),
    summary: z.string(),
  }),
});

export async function GET() {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const itineraries = await listItineraries(supabase, user.id);
    return NextResponse.json({ itineraries });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = saveItinerarySchema.parse(await request.json());

    const result = await saveWeekendPlanAsItinerary(supabase, user.id, body.title, body.plan);
    return NextResponse.json(result);
  });
}

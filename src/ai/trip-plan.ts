import { callStructuredTool, isAIConfigured } from "./client";
import { weekendPlanSchema } from "./schema";
import { brand } from "@/lib/config/brand";
import type { Experience } from "@/types/database";
import type { TripPlan, TripPlanRequest } from "@/types/ai";

const TRIP_PLAN_TOOL_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "string" },
          startTime: { type: "string" },
          title: { type: "string" },
          experienceId: { type: ["string", "null"] },
          estimatedCost: { type: ["number", "null"] },
          notes: { type: "string" },
        },
        required: ["day", "startTime", "title", "experienceId", "estimatedCost", "notes"],
      },
    },
    summary: { type: "string" },
  },
  required: ["items", "summary"],
} as const;

const MAX_TRIP_DAYS = 14;

function dayCount(startDate: string, endDate: string): number {
  const ms = new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.min(MAX_TRIP_DAYS, Math.round(ms / 86_400_000) + 1));
}

function dayLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `day_${i + 1}`);
}

const SYSTEM_PROMPT = `You are ${brand.name}'s AI Trip Planner. You build a realistic, well-paced multi-day
itinerary for a trip to a specific destination, using a list of real candidate experiences at that
destination plus generic filler items (breakfast, travel between spots, downtime) that don't map to a
specific listing.

Rules:
- Only use experienceId values from the candidate list, or null for generic filler (e.g. "Breakfast near
  the hotel", "Travel to next neighborhood", "Free evening to explore").
- NEVER invent a business name, address, or price for a filler item — keep those generic.
- Cover every day provided (day_1 through day_N) — don't skip days or leave one empty.
- Give each day 3-4 items, spaced realistically across morning/afternoon/evening, respecting the
  requested energy level (low = 2-3 relaxed items/day, high = 4-5 packed items/day) and social mode.
- Don't repeat the same experienceId on multiple days.
- Keep total cost roughly aligned with the requested budget level across the whole trip.
- Write a short, energetic 2-3 sentence summary of the overall trip.`;

/**
 * Multi-day equivalent of generateWeekendPlan (src/ai/weekend-plan.ts) — same
 * validated-structured-output pattern, just spanning as many real calendar
 * days as the trip covers (capped at MAX_TRIP_DAYS) instead of a fixed
 * weekend. Always requires AI configuration; there's no deterministic
 * multi-day fallback worth the complexity for a premium-only feature — if AI
 * isn't configured the route should refuse the request rather than hand back
 * a thin, obviously-worse plan.
 */
export async function generateTripPlan(request: TripPlanRequest, candidates: Experience[]): Promise<TripPlan | null> {
  if (!isAIConfigured() || candidates.length === 0) return null;

  const numDays = dayCount(request.startDate, request.endDate);
  const days = dayLabels(numDays);

  const prompt = `Trip: ${numDays}-day trip to ${request.destinationCity}, ${request.destinationCountry}
(${request.startDate} to ${request.endDate}).
Days to plan (use these exact labels): ${days.join(", ")}
Budget: ${request.budgetLevel}. Group: ${request.socialMode}. Energy level: ${request.energyLevel}.
Focus interests: ${request.interests.join(", ") || "any"}.

Candidate experiences available to slot in (real places at this destination):
${JSON.stringify(
  candidates.slice(0, 60).map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    priceLevel: c.priceLevel,
    priceEstimate: c.priceEstimate,
    durationMinutes: c.durationMinutes,
    rating: c.rating,
  })),
  null,
  2
)}

Build the full ${numDays}-day itinerary now, covering every day listed above.`;

  const result = await callStructuredTool<{ items: unknown[]; summary: string }>({
    system: SYSTEM_PROMPT,
    prompt,
    toolName: "submit_trip_plan",
    toolDescription: "Submit the generated multi-day trip itinerary.",
    inputSchema: TRIP_PLAN_TOOL_SCHEMA,
    maxTokens: 6000,
  });

  if (!result) return null;

  const parsed = weekendPlanSchema.safeParse(result);
  if (!parsed.success) {
    console.error("[ai] trip plan output failed validation:", parsed.error.message);
    return null;
  }

  const validIds = new Set(candidates.map((c) => c.id));
  const validDays = new Set(days);
  const items = parsed.data.items.filter(
    (i) => (i.experienceId === null || validIds.has(i.experienceId)) && validDays.has(i.day)
  );
  if (items.length === 0) return null;

  return {
    items,
    totalEstimatedCost: items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0),
    summary: parsed.data.summary,
  };
}

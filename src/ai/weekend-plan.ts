import { callStructuredTool, isAIConfigured } from "./client";
import { weekendPlanSchema } from "./schema";
import { brand } from "@/lib/config/brand";
import type { Experience, Profile } from "@/types/database";
import type { WeekendPlan, WeekendPlanRequest } from "@/types/ai";

const WEEKEND_PLAN_TOOL_SCHEMA = {
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

const SYSTEM_PROMPT = `You are ${brand.name}'s AI Weekend Planner. You build a realistic, well-paced itinerary from a
list of real candidate experiences plus generic filler items (coffee, lunch, downtime) that don't map
to a specific listing.

Rules:
- Only use experienceId values from the candidate list, or null for generic filler (e.g. "Coffee",
  "Lunch break", "Drive to next spot").
- NEVER invent a business name, address, or price for a filler item — keep those generic.
- Space items realistically across the day (roughly 2-4 hours apart), respecting the user's requested
  energy level and social mode.
- Keep total cost roughly aligned with the requested budget level.
- Write a short, energetic 1-2 sentence summary of the plan.`;

export async function generateWeekendPlan(
  profile: Profile,
  request: WeekendPlanRequest,
  candidates: Experience[]
): Promise<WeekendPlan> {
  const fallback = fallbackPlan(request, candidates);
  if (!isAIConfigured() || candidates.length === 0) return fallback;

  const prompt = `User: ${profile.firstName || "the user"}, interests: ${profile.interests.join(", ") || "varied"}.
Request: budget=${request.budgetLevel}, days=${request.days.join(", ")}, social=${request.socialMode}, energy=${request.energyLevel}, interests focus=${request.interests.join(", ") || "any"}.

Candidate experiences available to slot in:
${JSON.stringify(
  candidates.slice(0, 20).map((c) => ({
    id: c.id,
    title: c.title,
    category: c.category,
    priceLevel: c.priceLevel,
    priceEstimate: c.priceEstimate,
    durationMinutes: c.durationMinutes,
    bestTimeOfDay: c.bestTimeOfDay,
  })),
  null,
  2
)}

Build the itinerary now.`;

  const result = await callStructuredTool<{ items: unknown[]; summary: string }>({
    system: SYSTEM_PROMPT,
    prompt,
    toolName: "submit_weekend_plan",
    toolDescription: "Submit the generated weekend itinerary.",
    inputSchema: WEEKEND_PLAN_TOOL_SCHEMA,
    maxTokens: 3000,
    // A full weekend itinerary is a much bigger generation than the
    // recommendation-reasoning call — give it real room rather than the
    // short timeout tuned for that call's tiny batches.
    timeoutMs: 25_000,
  });

  if (!result) return fallback;

  const parsed = weekendPlanSchema.safeParse(result);
  if (!parsed.success) {
    console.error("[ai] weekend plan output failed validation:", parsed.error.message);
    return fallback;
  }

  const validIds = new Set(candidates.map((c) => c.id));
  const items = attachImages(
    parsed.data.items.filter((i) => i.experienceId === null || validIds.has(i.experienceId)),
    candidates
  );
  if (items.length === 0) return fallback;

  return {
    items,
    totalEstimatedCost: items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0),
    summary: parsed.data.summary,
  };
}

/**
 * The AI never sees or invents image URLs — it only picks experienceIds
 * from the real candidate list. This attaches each item's actual images by
 * looking up that same candidate, post-validation. Shared with
 * src/ai/trip-plan.ts.
 */
export function attachImages<T extends { experienceId: string | null }>(
  items: T[],
  candidates: Experience[]
): (T & { images: string[] })[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  return items.map((item) => ({
    ...item,
    images: item.experienceId ? (byId.get(item.experienceId)?.images.slice(0, 5) ?? []) : [],
  }));
}

function fallbackPlan(request: WeekendPlanRequest, candidates: Experience[]): WeekendPlan {
  const startTimes = ["09:00", "12:00", "15:00", "18:00"];
  const items = request.days.flatMap((day, dayIdx) =>
    candidates.slice(dayIdx * 2, dayIdx * 2 + 2).map((exp, i) => ({
      day,
      startTime: startTimes[i % startTimes.length],
      title: exp.title,
      experienceId: exp.id,
      estimatedCost: exp.priceEstimate,
      notes: exp.shortDescription,
      images: exp.images.slice(0, 5),
    }))
  );

  return {
    items: items.length > 0 ? items : [
      {
        day: request.days[0] ?? "saturday",
        startTime: "10:00",
        title: "Explore your city",
        experienceId: null,
        estimatedCost: 0,
        notes: "No matching experiences yet — try widening your interests.",
        images: [],
      },
    ],
    totalEstimatedCost: items.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0),
    summary: "A flexible plan built from your top-matched experiences.",
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The product's AI text is user-facing copy, held to the brand voice: calm, no
// exclamation points, no slang. One shared rule feeds all four prompts; these
// tests make sure it stays shared, stays quote-free (see voice.ts for the bug
// that taught us that), and that the stored /students preview obeys it.

const h = vi.hoisted(() => ({ systems: [] as string[] }));

vi.mock("@/ai/client", () => ({
  isAIConfigured: () => true,
  callStructuredTool: async (params: { system: string }) => {
    h.systems.push(params.system);
    return null;
  },
}));

import { VOICE_RULE } from "@/ai/voice";
import { generateAIRecommendations } from "@/ai/recommend";
import { generateWeekendPlan } from "@/ai/weekend-plan";
import { generateTripPlan } from "@/ai/trip-plan";
import { interpretItineraryChat, pickSwapCandidate } from "@/ai/itinerary-chat";
import { EXAMPLE_CANDIDATES, EXAMPLE_PROFILE } from "@/lib/students/preview";
import { rankExperiences } from "@/services/recommendation/scoring";

beforeEach(() => {
  h.systems.length = 0;
});

describe("the voice rule", () => {
  it("asks for calm copy and rules out exclamation points, emojis and slang", () => {
    expect(VOICE_RULE).toMatch(/calm/i);
    expect(VOICE_RULE).toMatch(/no exclamation points/i);
    expect(VOICE_RULE).toMatch(/no emojis/i);
  });

  it("contains no quotation marks or backticks: quoted words made the planner double-encode its output", () => {
    expect(VOICE_RULE).not.toMatch(/["'`“”‘’]/);
  });

  it("is part of every prompt that writes user-facing text", async () => {
    const ranked = rankExperiences(EXAMPLE_CANDIDATES, EXAMPLE_PROFILE).slice(0, 3);
    await generateAIRecommendations(ranked, {
      profile: EXAMPLE_PROFILE,
      location: null,
      now: new Date().toISOString(),
      weather: null,
      budgetOverride: null,
      travelStatus: { isTraveling: false, destinationCity: null },
      recentEvents: [],
      excludeExperienceIds: [],
    });
    await generateWeekendPlan(EXAMPLE_PROFILE, { budgetLevel: "low", days: ["saturday"], socialMode: "group", energyLevel: "medium", interests: [] }, EXAMPLE_CANDIDATES);
    await generateTripPlan(
      { destinationCity: "X", destinationCountry: "Y", destinationLatitude: 0, destinationLongitude: 0, startDate: "2026-10-01", endDate: "2026-10-02", budgetLevel: "low", socialMode: "group", energyLevel: "medium", interests: [] } as never,
      EXAMPLE_CANDIDATES
    );
    await interpretItineraryChat("swap lunch", { id: "i", title: "t", destinationCity: null } as never, [{ id: "a", dayIndex: 0, startTime: "10:00", title: "x", notes: null }] as never);
    await pickSwapCandidate("cheaper", [{ experienceId: "e", title: "x", category: "food_drink", images: [], priceEstimate: null, priceLevel: "low", rating: null, shortDescription: "x" }]);

    expect(h.systems).toHaveLength(5);
    for (const system of h.systems) {
      expect(system).toContain(VOICE_RULE);
      expect(system).not.toMatch(/energetic|\bwarm\b|friendly/i);
    }
  });
});

describe("the stored /students preview", () => {
  const raw = readFileSync(join(__dirname, "../lib/content/students-preview.json"), "utf-8");
  const preview = JSON.parse(raw);
  const text = [
    preview.surpriseMe.title,
    preview.surpriseMe.reasoning,
    preview.weekend.summary,
    ...preview.weekend.days.flatMap((d: { items: { title: string; note: string }[] }) => d.items.flatMap((i) => [i.title, i.note])),
  ].join("\n");

  it("has no exclamation points and no emoji", () => {
    expect(text).not.toContain("!");
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("states no price, rating or hour that was never supplied to the model", () => {
    expect(text).not.toMatch(/\$\s?\d|\d\s?(stars?|reviews?)|\b\d{1,2}\s?(am|pm)\b/i);
  });

  it("is complete: a pick, a summary, and items on at least one day", () => {
    expect(preview.surpriseMe.reasoning.length).toBeGreaterThan(20);
    expect(preview.weekend.summary.length).toBeGreaterThan(20);
    expect(preview.weekend.days.length).toBeGreaterThan(0);
    for (const day of preview.weekend.days) expect(day.items.length).toBeGreaterThan(0);
  });
});

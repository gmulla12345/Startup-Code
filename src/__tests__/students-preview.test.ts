import { describe, expect, it, vi } from "vitest";
import { EXAMPLE_CANDIDATES, EXAMPLE_PROFILE, generateStudentsPreview, type PreviewDeps } from "@/lib/students/preview";
import type { ScoredExperience } from "@/services/recommendation/scoring";
import type { WeekendPlan } from "@/types/ai";

// The /students page promises REAL example output. The generator therefore runs
// the real pipeline and refuses to write anything if either half quietly fell
// back to its non-AI version (which is exactly what happened, invisibly, when a
// prompt change once made the planner's output fail validation).

const FALLBACK_SUMMARY = "A flexible plan built from your top-matched experiences.";
const now = new Date("2026-10-14T19:00:00.000Z");

function deps(overrides: Partial<PreviewDeps> = {}): PreviewDeps {
  return {
    recommend: async (candidates: ScoredExperience[]) => [
      {
        experienceId: candidates[0].experience.id,
        matchScore: 90,
        reasoning: "A model-written reason that is not the deterministic one.",
        estimatedCost: null,
        estimatedDurationMinutes: null,
        recommendedTime: null,
        confidence: 0.8,
      },
    ],
    planWeekend: async (): Promise<WeekendPlan> => ({
      summary: "A calm, low-cost weekend.",
      totalEstimatedCost: 0,
      items: [
        { day: "sunday", startTime: "11:00", title: "Late item", experienceId: null, estimatedCost: null, notes: "n2", images: [] },
        { day: "saturday", startTime: "10:00", title: "First item", experienceId: "example-1", estimatedCost: null, notes: "n1", images: [] },
        { day: "sunday", startTime: "09:00", title: "Early item", experienceId: null, estimatedCost: null, notes: "n3", images: [] },
      ],
    }),
    now: () => now,
    model: "claude-test",
    ...overrides,
  };
}

describe("generating the preview", () => {
  it("returns the pick with its category label, and the plan grouped by day in time order", async () => {
    const result = await generateStudentsPreview(deps());
    expect(result.generatedAt).toBe(now.toISOString());
    expect(result.model).toBe("claude-test");
    expect(result.surpriseMe.reasoning).toBe("A model-written reason that is not the deterministic one.");
    expect(result.surpriseMe.title).toBeTruthy();
    expect(result.surpriseMe.category).toMatch(/\w/);
    expect(result.weekend.days.map((d) => d.day)).toEqual(["saturday", "sunday"]);
    expect(result.weekend.days[1].items.map((i) => i.time)).toEqual(["09:00", "11:00"]);
    expect(result.weekend.days[0].items[0]).toEqual({ time: "10:00", title: "First item", note: "n1" });
  });

  it("drops a day with no items", async () => {
    const result = await generateStudentsPreview(
      deps({
        planWeekend: async () => ({
          summary: "ok",
          totalEstimatedCost: 0,
          items: [{ day: "saturday", startTime: "10:00", title: "Only", experienceId: null, estimatedCost: null, notes: "n", images: [] }],
        }),
      })
    );
    expect(result.weekend.days.map((d) => d.day)).toEqual(["saturday"]);
  });

  it("refuses to ship Surprise Me's non-AI fallback reasoning", async () => {
    await expect(
      generateStudentsPreview(
        deps({
          recommend: async (candidates) => [
            {
              experienceId: candidates[0].experience.id,
              matchScore: 60,
              reasoning: candidates[0].reasons.join(". "),
              estimatedCost: null,
              estimatedDurationMinutes: null,
              recommendedTime: null,
              confidence: 0.6,
            },
          ],
        })
      )
    ).rejects.toThrow(/Surprise Me fell back/);
  });

  it("refuses to ship the Weekend Planner's non-AI fallback plan", async () => {
    await expect(
      generateStudentsPreview(deps({ planWeekend: async () => ({ summary: FALLBACK_SUMMARY, totalEstimatedCost: 0, items: [] }) }))
    ).rejects.toThrow(/Weekend Planner fell back/);
  });

  it("fails when there is no pick, or the plan is empty", async () => {
    await expect(generateStudentsPreview(deps({ recommend: async () => [] }))).rejects.toThrow(/no pick/);
    await expect(
      generateStudentsPreview(deps({ planWeekend: async () => ({ summary: "ok", totalEstimatedCost: 0, items: [] }) }))
    ).rejects.toThrow(/no items/);
  });

  it("feeds the real pipeline example inputs only: six scored candidates, and the planner every archetype", async () => {
    const recommend = vi.fn(deps().recommend);
    const planWeekend = vi.fn(deps().planWeekend);
    await generateStudentsPreview(deps({ recommend, planWeekend }));
    expect(recommend.mock.calls[0][0]).toHaveLength(6);
    expect(planWeekend.mock.calls[0][2]).toBe(EXAMPLE_CANDIDATES);
    expect(planWeekend.mock.calls[0][0]).toBe(EXAMPLE_PROFILE);
  });
});

describe("the example inputs", () => {
  it("are not real people, businesses, or Google Maps content", () => {
    expect(EXAMPLE_PROFILE.userId).toBe("example-user");
    for (const c of EXAMPLE_CANDIDATES) {
      expect(c.sourceProvider).toBe("manual");
      expect(c.sourceId).toBeNull();
      expect(c.images).toEqual([]);
      expect(c.address).toBeNull();
      expect(c.externalBookingUrl).toBeNull();
    }
  });

  it("carry no invented price, rating, review count, or hours", () => {
    for (const c of EXAMPLE_CANDIDATES) {
      expect(c.priceEstimate).toBeNull();
      expect(c.rating).toBeNull();
      expect(c.reviewCount).toBe(0);
      expect(c.availability).toBeNull();
    }
  });

  it("are campus-neutral: no city, school or street is named", () => {
    const titles = EXAMPLE_CANDIDATES.map((c) => c.title).join(" ");
    expect(titles).not.toMatch(/loyola|baltimore|maryland|street|avenue|\bst\b/i);
  });
});

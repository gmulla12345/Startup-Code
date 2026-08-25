import { describe, expect, it } from "vitest";
import {
  onboardingBasicsSchema,
  saveExperienceSchema,
  weekendPlanRequestSchema,
  trackEventSchema,
} from "@/lib/validation/schemas";

describe("API validation schemas", () => {
  it("accepts valid onboarding basics", () => {
    const result = onboardingBasicsSchema.safeParse({
      firstName: "Alex",
      ageRange: "25-27",
      city: "Baltimore",
    });
    expect(result.success).toBe(true);
  });

  it("rejects onboarding basics with an invalid age range", () => {
    const result = onboardingBasicsSchema.safeParse({
      firstName: "Alex",
      ageRange: "99-100",
      city: "Baltimore",
    });
    expect(result.success).toBe(false);
  });

  it("rejects onboarding basics missing a required field", () => {
    const result = onboardingBasicsSchema.safeParse({ ageRange: "25-27", city: "Baltimore" });
    expect(result.success).toBe(false);
  });

  it("defaults save collection to 'Saved'", () => {
    const result = saveExperienceSchema.parse({ experienceId: "exp-1" });
    expect(result.collection).toBe("Saved");
  });

  it("rejects an empty weekend plan days array", () => {
    const result = weekendPlanRequestSchema.safeParse({
      budgetLevel: "medium",
      days: [],
      socialMode: "solo",
      energyLevel: "medium",
      interests: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown event type", () => {
    const result = trackEventSchema.safeParse({ eventType: "not_a_real_event" });
    expect(result.success).toBe(false);
  });

  it("accepts a known event type with no experienceId", () => {
    const result = trackEventSchema.safeParse({ eventType: "searched_category", metadata: { query: "hiking" } });
    expect(result.success).toBe(true);
  });
});

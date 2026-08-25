import { describe, expect, it, beforeEach, vi } from "vitest";
import { isAIConfigured } from "@/ai/client";
import { generateAIRecommendations } from "@/ai/recommend";
import { scoreExperience } from "@/services/recommendation/scoring";
import { emptyPersonality, defaultPreferences } from "@/lib/repositories/profile";
import type { Experience, Profile } from "@/types/database";

describe("AI service — never fabricates, always falls back safely", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  it("reports not configured when no API key is set", () => {
    expect(isAIConfigured()).toBe(false);
  });

  it("falls back to deterministic scoring output when AI is unavailable", async () => {
    const profile: Profile = {
      id: "p1",
      userId: "u1",
      firstName: "Alex",
      lastName: null,
      ageRange: "25-27",
      city: "Baltimore",
      region: "MD",
      country: "USA",
      latitude: 39.29,
      longitude: -76.61,
      avatarUrl: null,
      bio: null,
      interests: ["hiking"],
      lifestyleGoals: [],
      personality: emptyPersonality(),
      preferences: defaultPreferences(),
      onboardingCompleted: true,
      onboardingStep: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const experience: Experience = {
      id: "exp-1",
      slug: "test-hike",
      title: "Test Hike",
      description: "desc",
      shortDescription: "short",
      category: "outdoor_adventure",
      tags: ["hiking"],
      images: [],
      city: "Baltimore",
      region: "MD",
      country: "USA",
      address: null,
      latitude: 39.3,
      longitude: -76.6,
      priceLevel: "medium",
      priceEstimate: 20,
      priceCurrency: "USD",
      durationMinutes: 90,
      indoorOutdoor: "outdoor",
      socialMode: "either",
      bestTimeOfDay: "morning",
      rating: 4.5,
      reviewCount: 5,
      isHiddenGem: false,
      isFeatured: false,
      isPremium: false,
      externalBookingUrl: null,
      sourceProvider: "mock",
      sourceId: null,
      requirements: [],
      availability: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scored = scoreExperience(experience, profile);

    const result = await generateAIRecommendations([scored], {
      profile,
      location: { city: "Baltimore", latitude: 39.29, longitude: -76.61 },
      now: new Date().toISOString(),
      weather: null,
      budgetOverride: null,
      travelStatus: { isTraveling: false, destinationCity: null },
      recentEvents: [],
      excludeExperienceIds: [],
    });

    // Without an API key, the AI layer must return the deterministic
    // fallback derived straight from the scorer — never fabricated data,
    // and never a thrown error surfaced to the caller.
    expect(result).toHaveLength(1);
    expect(result[0].experienceId).toBe(experience.id);
    expect(result[0].matchScore).toBe(scored.score);
    expect(result[0].estimatedCost).toBe(experience.priceEstimate);
  });
});

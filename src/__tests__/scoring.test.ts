import { describe, expect, it } from "vitest";
import { scoreExperience, rankExperiences } from "@/services/recommendation/scoring";
import { emptyPersonality, defaultPreferences } from "@/lib/repositories/profile";
import type { Experience, Profile } from "@/types/database";

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile-1",
    userId: "user-1",
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
    interests: ["hiking", "photography"],
    lifestyleGoals: [],
    personality: emptyPersonality(),
    preferences: defaultPreferences(),
    onboardingCompleted: true,
    onboardingStep: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: "exp-1",
    slug: "test-hike",
    title: "Test Hike",
    description: "A hike",
    shortDescription: "A hike",
    category: "outdoor_adventure",
    tags: ["hiking", "photography"],
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
    durationMinutes: 120,
    indoorOutdoor: "outdoor",
    socialMode: "either",
    bestTimeOfDay: "morning",
    rating: 4.5,
    reviewCount: 10,
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
    ...overrides,
  };
}

describe("scoreExperience", () => {
  it("scores higher when tags overlap with user interests", () => {
    const profile = makeProfile();
    const matching = scoreExperience(makeExperience({ tags: ["hiking", "photography"] }), profile);
    const nonMatching = scoreExperience(makeExperience({ tags: ["nightlife"] }), profile);

    expect(matching.score).toBeGreaterThan(nonMatching.score);
  });

  it("penalizes experiences the user already dismissed", () => {
    const profile = makeProfile();
    const experience = makeExperience();

    const base = scoreExperience(experience, profile);
    const dismissed = scoreExperience(experience, profile, { dismissedIds: new Set([experience.id]) });

    expect(dismissed.score).toBeLessThan(base.score);
  });

  it("clamps scores to the 0-100 range", () => {
    const profile = makeProfile();
    const experience = makeExperience({ isFeatured: true, isHiddenGem: true, rating: 5 });
    const result = scoreExperience(experience, profile);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("keeps distant experiences from scoring higher than nearby ones, all else equal", () => {
    const profile = makeProfile({ preferences: { ...defaultPreferences(), maxDistanceMiles: 25 } });
    const nearby = scoreExperience(makeExperience({ id: "near", latitude: 39.29, longitude: -76.61 }), profile);
    const far = scoreExperience(makeExperience({ id: "far", latitude: 40.5, longitude: -75.0 }), profile);

    expect(nearby.score).toBeGreaterThan(far.score);
  });
});

describe("rankExperiences", () => {
  it("returns experiences sorted by descending score", () => {
    const profile = makeProfile();
    const experiences = [
      makeExperience({ id: "a", tags: ["nightlife"] }),
      makeExperience({ id: "b", tags: ["hiking", "photography"] }),
    ];

    const ranked = rankExperiences(experiences, profile);
    expect(ranked[0].experience.id).toBe("b");
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });
});

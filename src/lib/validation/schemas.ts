import { z } from "zod";

export const checkoutRequestSchema = z.object({
  billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
});

export const contactMessageSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(4000),
});

export const jobApplicationSchema = z.object({
  role: z.string().min(1).max(100),
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  linkedinUrl: z.string().url().nullable().optional(),
  coverLetter: z.string().min(20).max(4000),
});

export const onboardingBasicsSchema = z.object({
  firstName: z.string().min(1).max(50),
  ageRange: z.enum(["18-20", "21-24", "25-27", "28-30", "31-35", "36+"]),
  city: z.string().min(1).max(100),
  region: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const onboardingInterestsSchema = z.object({
  interests: z.array(z.string()).min(1).max(20),
});

export const onboardingPersonalitySchema = z.object({
  personality: z.object({
    spontaneousVsPlanned: z.number().min(0).max(100),
    quietVsSocial: z.number().min(0).max(100),
    adventurousVsComfortable: z.number().min(0).max(100),
    budgetVsLuxury: z.number().min(0).max(100),
    familiarVsNovel: z.number().min(0).max(100),
  }),
});

export const onboardingPreferencesSchema = z.object({
  preferences: z.object({
    budgetLevel: z.enum(["free", "low", "medium", "high", "luxury"]),
    travelFrequency: z.enum(["rarely", "sometimes", "often", "constantly"]),
    maxDistanceMiles: z.number().min(1).max(500),
    preferredDurationMinutes: z.number().min(15).max(1440),
    indoorOutdoor: z.enum(["indoor", "outdoor", "either"]),
    socialMode: z.enum(["solo", "group", "either"]),
    timeOfDay: z.enum(["morning", "afternoon", "evening", "night", "any"]),
  }),
});

export const onboardingGoalsSchema = z.object({
  lifestyleGoals: z.array(z.string()).max(10),
});

export const saveExperienceSchema = z.object({
  experienceId: z.string().min(1),
  collection: z.string().min(1).max(50).default("Saved"),
  tags: z.array(z.string()).max(30).default([]),
  category: z.string().nullable().optional(),
});

export const trackEventSchema = z.object({
  eventType: z.enum([
    "viewed_experience",
    "saved_experience",
    "dismissed_experience",
    "shared_experience",
    "clicked_booking",
    "booked_experience",
    "attended_experience",
    "searched_category",
    "changed_preference",
    "surprise_me_requested",
    "surprise_me_feedback",
  ]),
  experienceId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const weekendPlanRequestSchema = z.object({
  budgetLevel: z.string(),
  days: z.array(z.enum(["friday_evening", "saturday", "sunday"])).min(1),
  socialMode: z.enum(["solo", "group"]),
  energyLevel: z.enum(["low", "medium", "high"]),
  interests: z.array(z.string()).default([]),
});

export const surpriseMeFeedbackSchema = z.object({
  experienceId: z.string(),
  feedback: z.enum(["lets_go", "not_for_me"]),
  excludeIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).max(30).default([]),
  category: z.string().nullable().optional(),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const tripPlanRequestSchema = z
  .object({
    destinationCity: z.string().min(1),
    destinationCountry: z.string().min(1),
    destinationLatitude: z.number(),
    destinationLongitude: z.number(),
    startDate: isoDate,
    endDate: isoDate,
    budgetLevel: z.string(),
    socialMode: z.enum(["solo", "group"]),
    energyLevel: z.enum(["low", "medium", "high"]),
    interests: z.array(z.string()).default([]),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date." })
  .refine(
    (v) => {
      const days = (new Date(`${v.endDate}T00:00:00Z`).getTime() - new Date(`${v.startDate}T00:00:00Z`).getTime()) / 86_400_000 + 1;
      return days <= 14;
    },
    { message: "Trips longer than 14 days aren't supported yet — try a shorter date range." }
  );

export const experienceQuerySchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  priceLevel: z.array(z.string()).optional(),
  indoorOutdoor: z.string().optional(),
  socialMode: z.string().optional(),
  hiddenGemsOnly: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusMiles: z.number().optional(),
  limit: z.number().max(200).optional(),
});

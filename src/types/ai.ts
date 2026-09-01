import type { Experience, Profile } from "./database";

/**
 * Structured output the AI layer must produce. We never rely on free-form
 * text for anything the UI renders as fact — the model returns typed JSON
 * that is validated with zod before use (see ai/schema.ts).
 */
export interface StructuredRecommendation {
  experienceId: string;
  matchScore: number; // 0-100
  reasoning: string;
  estimatedCost: number | null;
  estimatedDurationMinutes: number | null;
  recommendedTime: string | null;
  confidence: number; // 0-1
}

export interface RecommendationContext {
  profile: Profile;
  location: { city: string; latitude: number; longitude: number } | null;
  now: string; // ISO timestamp
  weather: WeatherSnapshot | null;
  budgetOverride: string | null;
  travelStatus: { isTraveling: boolean; destinationCity: string | null };
  recentEvents: string[]; // short human-readable recent behavior summaries
  excludeExperienceIds: string[];
}

export interface WeatherSnapshot {
  condition: "clear" | "clouds" | "rain" | "snow" | "storm" | "unknown";
  temperatureF: number;
  isGoodForOutdoor: boolean;
  source: "live" | "mock";
}

export interface SurpriseMeResult {
  experience: Experience;
  recommendation: StructuredRecommendation;
  headline: string;
}

export interface WeekendPlanRequest {
  budgetLevel: string;
  days: ("saturday" | "sunday" | "friday_evening")[];
  socialMode: "solo" | "group";
  energyLevel: "low" | "medium" | "high";
  interests: string[];
}

export interface WeekendPlanItem {
  day: string;
  startTime: string;
  title: string;
  experienceId: string | null;
  estimatedCost: number | null;
  notes: string;
}

export interface WeekendPlan {
  items: WeekendPlanItem[];
  totalEstimatedCost: number;
  summary: string;
}

export interface TripPlanRequest {
  destinationCity: string;
  destinationCountry: string;
  destinationLatitude: number;
  destinationLongitude: number;
  startDate: string; // ISO date, e.g. "2026-09-12"
  endDate: string; // ISO date, inclusive
  budgetLevel: string;
  socialMode: "solo" | "group";
  energyLevel: "low" | "medium" | "high";
  interests: string[];
}

// Same shape as a weekend plan, just spanning as many real calendar days as
// the trip covers instead of a fixed weekend — day labels are "day_1".."day_N".
export type TripPlanItem = WeekendPlanItem;
export type TripPlan = WeekendPlan;

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string | null,
    ageRange: row.age_range as Profile["ageRange"],
    city: row.city as string | null,
    region: row.region as string | null,
    country: row.country as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    avatarUrl: row.avatar_url as string | null,
    bio: row.bio as string | null,
    interests: (row.interests as Profile["interests"]) ?? [],
    lifestyleGoals: (row.lifestyle_goals as Profile["lifestyleGoals"]) ?? [],
    personality: row.personality as Profile["personality"],
    preferences: row.preferences as Profile["preferences"],
    onboardingCompleted: Boolean(row.onboarding_completed),
    onboardingStep: (row.onboarding_step as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Cached per request — the (app) layout and the page it renders both need
 * the profile, and used to each fetch it independently. Relies on
 * `client` being a stable reference (see the cached createClient() in
 * lib/supabase/server.ts) — a fresh client instance would defeat this.
 */
export const getProfileByUserId = cache(async function getProfileByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data);
});

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string | null;
  ageRange?: Profile["ageRange"];
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avatarUrl?: string | null;
  bio?: string | null;
  interests?: Profile["interests"];
  lifestyleGoals?: Profile["lifestyleGoals"];
  personality?: Partial<Profile["personality"]>;
  preferences?: Partial<Profile["preferences"]>;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  input: ProfileUpdateInput
): Promise<Profile> {
  const existing = await getProfileByUserId(client, userId);

  const patch: Record<string, unknown> = {};
  if (input.firstName !== undefined) patch.first_name = input.firstName;
  if (input.lastName !== undefined) patch.last_name = input.lastName;
  if (input.ageRange !== undefined) patch.age_range = input.ageRange;
  if (input.city !== undefined) patch.city = input.city;
  if (input.region !== undefined) patch.region = input.region;
  if (input.country !== undefined) patch.country = input.country;
  if (input.latitude !== undefined) patch.latitude = input.latitude;
  if (input.longitude !== undefined) patch.longitude = input.longitude;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.interests !== undefined) patch.interests = input.interests;
  if (input.lifestyleGoals !== undefined) patch.lifestyle_goals = input.lifestyleGoals;
  if (input.personality !== undefined) {
    patch.personality = { ...(existing?.personality ?? {}), ...input.personality };
  }
  if (input.preferences !== undefined) {
    patch.preferences = { ...(existing?.preferences ?? {}), ...input.preferences };
  }
  if (input.onboardingCompleted !== undefined) patch.onboarding_completed = input.onboardingCompleted;
  if (input.onboardingStep !== undefined) patch.onboarding_step = input.onboardingStep;

  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(`updateProfile: ${error.message}`);
  return rowToProfile(data);
}

export function emptyPersonality(): Profile["personality"] {
  return {
    spontaneousVsPlanned: 50,
    quietVsSocial: 50,
    adventurousVsComfortable: 50,
    budgetVsLuxury: 50,
    familiarVsNovel: 50,
  };
}

export function defaultPreferences(): Profile["preferences"] {
  return {
    budgetLevel: "medium",
    travelFrequency: "sometimes",
    maxDistanceMiles: 25,
    preferredDurationMinutes: 120,
    indoorOutdoor: "either",
    socialMode: "either",
    timeOfDay: "any",
  };
}

import { createPublicClient } from "@/lib/supabase/public";
import { MockExperienceProvider } from "./mock-experience-provider";
import { SupabaseExperienceProvider } from "./supabase-experience-provider";
import { ResilientExperienceProvider } from "./resilient-experience-provider";
import { MockPlacesProvider } from "./mock-places-provider";
import { GooglePlacesProvider } from "./google-places-provider";
import { CatalogEventsProvider } from "./events-provider";
import { CatalogTravelProvider } from "./travel-provider";
import { CompositeExperienceProvider } from "./composite-experience-provider";
import type { ExperienceProvider, PlacesProvider, EventsProvider, TravelProvider } from "./types";

export * from "./types";

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}

let mockSingleton: MockExperienceProvider | null = null;

/**
 * Server-only factory for the experience catalog provider. Call from
 * Server Components, Route Handlers, or Server Actions. Uses a cookie-free
 * anon client (src/lib/supabase/public.ts) rather than the session-aware
 * one — the catalog is public/RLS-open regardless of who's asking, and
 * avoiding next/headers' cookies() here keeps pages that only need catalog
 * data (the marketing page, sitemap.xml) eligible for static rendering.
 *
 * When MAPS_API_KEY is set, the curated catalog (Supabase or mock) is
 * blended with live Google Places results — this is what makes discovery
 * work for a user anywhere in the world, not just our hand-seeded cities.
 */
export async function getExperienceProvider(): Promise<ExperienceProvider> {
  const curated = isSupabaseConfigured()
    ? new ResilientExperienceProvider(new SupabaseExperienceProvider(createPublicClient()))
    : (mockSingleton ??= new MockExperienceProvider());

  const mapsKey = process.env.MAPS_API_KEY;
  return mapsKey ? new CompositeExperienceProvider(curated, mapsKey) : curated;
}

export function getPlacesProvider(): PlacesProvider {
  const key = process.env.MAPS_API_KEY;
  if (key) return new GooglePlacesProvider(key);
  return new MockPlacesProvider();
}

export async function getEventsProvider(): Promise<EventsProvider> {
  return new CatalogEventsProvider(await getExperienceProvider());
}

export function getTravelProvider(): TravelProvider {
  return new CatalogTravelProvider();
}

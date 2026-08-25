import type { Experience, ExperienceCategory } from "@/types/database";

/**
 * Provider abstractions. Nothing in the app should import a concrete
 * provider directly — always go through services/providers/index.ts so the
 * underlying data source (mock, Supabase, a real Places/Events API) can be
 * swapped without touching call sites.
 */

export interface ExperienceQuery {
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
  category?: ExperienceCategory;
  tags?: string[];
  priceLevel?: string[];
  indoorOutdoor?: string;
  socialMode?: string;
  hiddenGemsOnly?: boolean;
  featuredOnly?: boolean;
  search?: string;
  excludeIds?: string[];
  limit?: number;
}

export interface ExperienceProvider {
  list(query: ExperienceQuery): Promise<Experience[]>;
  getById(id: string): Promise<Experience | null>;
  getBySlug(slug: string): Promise<Experience | null>;
  getRelated(experienceId: string, limit?: number): Promise<Experience[]>;
}

export interface GeocodeResult {
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  source: "google_places" | "mock";
}

export interface PlacesProvider {
  geocode(query: string): Promise<GeocodeResult | null>;
  isLive(): boolean;
}

export interface EventsProvider {
  listUpcoming(city: string, limit?: number): Promise<Experience[]>;
  isLive(): boolean;
}

export interface DestinationInfo {
  slug: string;
  city: string;
  country: string;
  description: string;
  coverImage: string;
  latitude: number;
  longitude: number;
  bestMonths: string[];
}

export interface TravelProvider {
  getDestination(citySlug: string): Promise<DestinationInfo | null>;
  listDestinations(): Promise<DestinationInfo[]>;
  search(query: string): Promise<DestinationInfo[]>;
}

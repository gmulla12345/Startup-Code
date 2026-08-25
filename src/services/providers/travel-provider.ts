import { DESTINATIONS } from "@/db/seed-data";
import type { DestinationInfo, TravelProvider } from "./types";

/**
 * Destination metadata for Travel Mode. Backed by the seed catalog today;
 * swap the implementation for a Supabase-backed one (mirroring
 * SupabaseExperienceProvider) once destinations are admin-managed at scale.
 */
export class CatalogTravelProvider implements TravelProvider {
  async getDestination(citySlug: string): Promise<DestinationInfo | null> {
    return DESTINATIONS.find((d) => d.slug === citySlug) ?? null;
  }

  async listDestinations(): Promise<DestinationInfo[]> {
    return DESTINATIONS;
  }

  async search(query: string): Promise<DestinationInfo[]> {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) => d.city.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
    );
  }
}

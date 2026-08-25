import type { Experience } from "@/types/database";
import type { ExperienceProvider, ExperienceQuery } from "./types";
import { GooglePlacesExperienceProvider } from "./google-places-experience-provider";

/**
 * Blends the hand-curated catalog (Supabase or mock) with live, worldwide
 * results from Google Places. This is what lets the app work for a user
 * in any city — not just the cities we've hand-seeded — while still
 * surfacing our curated "hidden gem" storytelling where we have it.
 */
export class CompositeExperienceProvider implements ExperienceProvider {
  private google: GooglePlacesExperienceProvider;

  constructor(
    private curated: ExperienceProvider,
    googleApiKey: string
  ) {
    this.google = new GooglePlacesExperienceProvider(googleApiKey);
  }

  private isGoogleId(id: string): boolean {
    return id.startsWith(GooglePlacesExperienceProvider.PREFIX);
  }

  async list(query: ExperienceQuery): Promise<Experience[]> {
    const hasLocation = query.latitude != null && query.longitude != null;

    const [curatedResults, googleResults] = await Promise.all([
      this.curated.list(query),
      hasLocation ? this.google.list(query) : Promise.resolve([]),
    ]);

    // Curated results first (they carry our editorial "why this matches you"
    // framing); live Google results fill in everywhere our catalog doesn't
    // reach yet.
    const combined = [...curatedResults, ...googleResults];
    return combined.slice(0, query.limit ?? combined.length);
  }

  async getById(id: string): Promise<Experience | null> {
    return this.isGoogleId(id) ? this.google.getById(id) : this.curated.getById(id);
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    return this.isGoogleId(slug) ? this.google.getBySlug(slug) : this.curated.getBySlug(slug);
  }

  async getRelated(experienceId: string, limit = 4): Promise<Experience[]> {
    return this.isGoogleId(experienceId)
      ? this.google.getRelated(experienceId, limit)
      : this.curated.getRelated(experienceId, limit);
  }
}

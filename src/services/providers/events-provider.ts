import type { Experience } from "@/types/database";
import type { EventsProvider, ExperienceProvider } from "./types";

/**
 * V1 "events" are simply time-relevant experiences (music, nightlife,
 * social) drawn from the same catalog as everything else. This keeps a
 * single source of truth while leaving room to swap in a real events API
 * (Eventbrite/Ticketmaster via EVENT_API_KEY) later without touching call
 * sites — implement isLive()/listUpcoming() against the real API and wire
 * it into the factory in index.ts.
 */
export class CatalogEventsProvider implements EventsProvider {
  constructor(private experiences: ExperienceProvider) {}

  isLive() {
    return false;
  }

  async listUpcoming(city: string, limit = 10): Promise<Experience[]> {
    const results = await this.experiences.list({
      city,
      limit: 50,
    });
    return results
      .filter((e) => ["music_entertainment", "nightlife", "social"].includes(e.category))
      .slice(0, limit);
  }
}

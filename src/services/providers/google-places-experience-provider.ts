import type { Experience, ExperienceCategory, BudgetLevel } from "@/types/database";
import type { ExperienceProvider, ExperienceQuery } from "./types";

/**
 * Live, worldwide experience data sourced directly from Google Places —
 * this is what makes discovery work in any city, not just the hand-curated
 * catalog (see mock-experience-provider.ts / supabase-experience-provider.ts).
 * Results are fetched on demand and are not stored in our database; photos
 * are real Google Places photos of the actual location (Place Photos API),
 * never generic stock images.
 */

const CATEGORY_TO_PLACE_TYPE: Record<ExperienceCategory, string> = {
  outdoor_adventure: "tourist_attraction",
  food_drink: "restaurant",
  nightlife: "night_club",
  arts_culture: "museum",
  wellness: "spa",
  sports_fitness: "gym",
  music_entertainment: "movie_theater",
  history_learning: "museum",
  hidden_gem: "tourist_attraction",
  day_trip: "tourist_attraction",
  travel: "tourist_attraction",
  social: "bar",
};

// When no specific category is requested (the common case for the home feed
// and Surprise Me), searching only "tourist_attraction" biases heavily
// toward the handful of most-famous landmarks in an area — Google's Nearby
// Search ranks by prominence, so that one bucket surfaces the same obvious
// places every time. Fanning out across several types in parallel gives a
// genuinely diverse, much larger real candidate pool (still 100% real
// places) for the scorer to actually discriminate between, including room
// for the isHiddenGem heuristic (low review count + high rating) to surface
// something other than the most obvious tourist spot.
const DIVERSITY_TYPES = ["tourist_attraction", "restaurant", "cafe", "museum", "park", "bar", "spa"];

const PLACE_TYPE_TO_CATEGORY: Record<string, ExperienceCategory> = {
  restaurant: "food_drink",
  cafe: "food_drink",
  bar: "nightlife",
  night_club: "nightlife",
  museum: "arts_culture",
  art_gallery: "arts_culture",
  spa: "wellness",
  gym: "sports_fitness",
  stadium: "sports_fitness",
  movie_theater: "music_entertainment",
  tourist_attraction: "outdoor_adventure",
  park: "outdoor_adventure",
  amusement_park: "outdoor_adventure",
  zoo: "outdoor_adventure",
  aquarium: "outdoor_adventure",
};

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: { photo_reference: string }[];
  opening_hours?: { open_now?: boolean };
  editorial_summary?: { overview?: string };
  reviews?: { text: string }[];
}

function priceLevelToBudget(level: number | undefined): BudgetLevel {
  switch (level) {
    case 0:
      return "free";
    case 1:
      return "low";
    case 2:
      return "medium";
    case 3:
      return "high";
    case 4:
      return "luxury";
    default:
      return "medium";
  }
}

function inferCategory(types: string[] | undefined): ExperienceCategory {
  for (const t of types ?? []) {
    if (PLACE_TYPE_TO_CATEGORY[t]) return PLACE_TYPE_TO_CATEGORY[t];
  }
  return "hidden_gem";
}

function photoUrl(photoReference: string, apiKey: string, maxWidth = 1200): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${apiKey}`;
}

export class GooglePlacesExperienceProvider implements ExperienceProvider {
  /** Prefix namespaces Google-sourced ids/slugs so routing can tell them apart from curated catalog ids. */
  static readonly PREFIX = "g-";

  constructor(private apiKey: string) {}

  private toExperience(place: GooglePlace, cityHint?: string): Experience {
    const category = inferCategory(place.types);
    const images = (place.photos ?? [])
      .slice(0, 5)
      .map((p) => photoUrl(p.photo_reference, this.apiKey));

    // Nearby Search only returns `vicinity` ("<landmark>, <city>" — no
    // country); Place Details returns full `formatted_address` (ends in
    // country). A precise structured split needs address_components, which
    // neither of these calls returns, so treat the two shapes differently
    // rather than guessing one heuristic across both.
    let country = "";
    let cityFromAddress = "";
    if (place.formatted_address) {
      const parts = place.formatted_address.split(",").map((s) => s.trim()).filter(Boolean);
      country = parts[parts.length - 1] ?? "";
      cityFromAddress = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] ?? "");
    } else if (place.vicinity) {
      const parts = place.vicinity.split(",").map((s) => s.trim()).filter(Boolean);
      cityFromAddress = parts[parts.length - 1] ?? "";
    }
    const region = null;

    return {
      id: `${GooglePlacesExperienceProvider.PREFIX}${place.place_id}`,
      slug: `${GooglePlacesExperienceProvider.PREFIX}${place.place_id}`,
      title: place.name,
      description:
        place.editorial_summary?.overview ??
        `${place.name} is a real, live-listed place on Google Maps${place.rating ? ` rated ${place.rating}/5` : ""}. Details here are pulled directly from Google — verify hours and availability before you go.`,
      shortDescription: place.editorial_summary?.overview ?? `A real place near ${cityHint ?? "you"}, sourced live from Google Maps.`,
      category,
      tags: [],
      images,
      city: cityHint ?? cityFromAddress ?? "",
      region,
      country,
      address: place.formatted_address ?? place.vicinity ?? null,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      priceLevel: priceLevelToBudget(place.price_level),
      priceEstimate: null,
      priceCurrency: "USD",
      durationMinutes: null,
      indoorOutdoor: "either",
      socialMode: "either",
      bestTimeOfDay: "any",
      rating: place.rating ?? null,
      reviewCount: place.user_ratings_total ?? 0,
      isHiddenGem: (place.user_ratings_total ?? 0) < 200 && (place.rating ?? 0) >= 4.5,
      isFeatured: false,
      isPremium: false,
      externalBookingUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      sourceProvider: "google_places",
      sourceId: place.place_id,
      requirements: [],
      availability: place.opening_hours?.open_now === undefined ? null : place.opening_hours.open_now ? "Open now" : "Closed now",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async fetchNearby(type: string, query: ExperienceQuery): Promise<GooglePlace[]> {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${query.latitude},${query.longitude}`);
    url.searchParams.set("radius", String(Math.min((query.radiusMiles ?? 15) * 1609, 50000)));
    url.searchParams.set("type", type);
    if (query.search) url.searchParams.set("keyword", query.search);
    url.searchParams.set("key", this.apiKey);

    try {
      const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
      if (!res.ok) return [];
      const data = (await res.json()) as { status: string; results: GooglePlace[] };
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("[google places] list failed:", type, data.status);
        return [];
      }
      return data.results ?? [];
    } catch (err) {
      console.error("[google places] list threw:", type, err);
      return [];
    }
  }

  async list(query: ExperienceQuery): Promise<Experience[]> {
    if (query.latitude == null || query.longitude == null) return [];

    const types = query.category ? [CATEGORY_TO_PLACE_TYPE[query.category]] : DIVERSITY_TYPES;
    const resultsByType = await Promise.all(types.map((type) => this.fetchNearby(type, query)));

    const seenPlaceIds = new Set<string>();
    const merged: GooglePlace[] = [];
    for (const places of resultsByType) {
      for (const place of places) {
        if (!place.place_id || seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);
        merged.push(place);
      }
    }

    let results = merged
      .filter((p) => p.geometry?.location)
      .map((p) => this.toExperience(p, query.city));

    if (query.excludeIds && query.excludeIds.length > 0) {
      const excludeSet = new Set(query.excludeIds);
      results = results.filter((e) => !excludeSet.has(e.id));
    }
    if (query.hiddenGemsOnly) results = results.filter((e) => e.isHiddenGem);
    if (query.priceLevel && query.priceLevel.length > 0) {
      results = results.filter((e) => query.priceLevel!.includes(e.priceLevel));
    }

    return results.slice(0, query.limit ?? 20);
  }

  private async fetchDetails(placeId: string): Promise<Experience | null> {
    const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    url.searchParams.set("place_id", placeId);
    url.searchParams.set(
      "fields",
      "place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,types,photos,opening_hours,editorial_summary,reviews"
    );
    url.searchParams.set("key", this.apiKey);

    try {
      const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 } });
      if (!res.ok) return null;
      const data = (await res.json()) as { status: string; result?: GooglePlace };
      if (data.status !== "OK" || !data.result) return null;
      return this.toExperience(data.result);
    } catch (err) {
      console.error("[google places] details threw:", err);
      return null;
    }
  }

  async getById(id: string): Promise<Experience | null> {
    const placeId = id.startsWith(GooglePlacesExperienceProvider.PREFIX)
      ? id.slice(GooglePlacesExperienceProvider.PREFIX.length)
      : id;
    return this.fetchDetails(placeId);
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    return this.getById(slug);
  }

  async getRelated(experienceId: string, limit = 4): Promise<Experience[]> {
    const source = await this.getById(experienceId);
    if (!source) return [];
    const related = await this.list({
      latitude: source.latitude,
      longitude: source.longitude,
      radiusMiles: 5,
      category: source.category,
      limit: limit + 1,
    });
    return related.filter((e) => e.id !== source.id).slice(0, limit);
  }
}

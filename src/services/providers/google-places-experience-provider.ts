import type { Experience, ExperienceCategory, BudgetLevel, InterestTag } from "@/types/database";
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

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  address_components?: AddressComponent[];
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

function addressComponent(components: AddressComponent[] | undefined, type: string): string | null {
  return components?.find((c) => c.types.includes(type))?.long_name ?? null;
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

// Every real (Google Places-sourced) experience used to get `tags: []` and
// `indoorOutdoor: "either"` unconditionally — meaning scoreExperience's
// interest-tag-overlap bonus (its own comment calls this "the strongest
// signal") and the indoor/outdoor preference bonus were both silent no-ops
// for effectively all production content, since production is Google
// Places-only (see CLAUDE.md). Fixed 2026-09-04 by actually deriving both
// from Google's `types` array, the same source inferCategory already reads.
const PLACE_TYPE_TO_TAGS: Partial<Record<string, InterestTag[]>> = {
  restaurant: ["food"],
  cafe: ["food"],
  bakery: ["food"],
  bar: ["nightlife"],
  night_club: ["nightlife", "music"],
  museum: ["art", "history", "culture", "learning"],
  art_gallery: ["art", "culture"],
  spa: ["wellness"],
  gym: ["fitness"],
  stadium: ["sports"],
  movie_theater: ["music"],
  tourist_attraction: ["adventure", "photography"],
  park: ["outdoors", "nature"],
  amusement_park: ["adventure"],
  zoo: ["nature", "outdoors"],
  aquarium: ["nature"],
  natural_feature: ["nature", "outdoors"],
  campground: ["outdoors", "nature", "adventure"],
  library: ["learning"],
  book_store: ["learning"],
  shopping_mall: ["luxury"],
  casino: ["nightlife", "luxury"],
  bowling_alley: ["sports"],
};

function inferTags(types: string[] | undefined): InterestTag[] {
  const tags = new Set<InterestTag>();
  for (const t of types ?? []) {
    for (const tag of PLACE_TYPE_TO_TAGS[t] ?? []) tags.add(tag);
  }
  return Array.from(tags).slice(0, 6);
}

// Only called when a type unambiguously signals one or the other — e.g.
// "tourist_attraction" and "restaurant" both turn up on plenty of indoor AND
// outdoor places in practice, so mixed/unclear results fall back to
// "either" (no bonus, no penalty) rather than guessing wrong.
const OUTDOOR_TYPES = new Set(["park", "amusement_park", "zoo", "natural_feature", "campground"]);
const INDOOR_TYPES = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "bar",
  "night_club",
  "museum",
  "art_gallery",
  "spa",
  "gym",
  "movie_theater",
  "library",
  "book_store",
  "shopping_mall",
  "casino",
  "bowling_alley",
  "aquarium",
]);

function inferIndoorOutdoor(types: string[] | undefined): "indoor" | "outdoor" | "either" {
  const list = types ?? [];
  const isOutdoor = list.some((t) => OUTDOOR_TYPES.has(t));
  const isIndoor = list.some((t) => INDOOR_TYPES.has(t));
  if (isOutdoor && !isIndoor) return "outdoor";
  if (isIndoor && !isOutdoor) return "indoor";
  return "either";
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

    // Nearby Search (list results) only returns `vicinity` ("<landmark>,
    // <city>" — no country), so the comma-split heuristic below is the only
    // option there. Place Details (single-experience lookups) can return
    // structured `address_components` instead — requested explicitly in
    // fetchDetails() below — which is used whenever present, since it's
    // reliably correct regardless of how many comma-separated segments the
    // formatted address happens to have. The old formatted_address
    // comma-split fallback got this wrong for a standard 4-segment US
    // address ("<street>, <city>, <state> <zip>, <country>") — it grabbed
    // the second-to-last segment expecting it to be the city, but that's
    // "<state> <zip>", not the city (e.g. "MD 21076" instead of "Hanover").
    let country = "";
    let cityFromAddress = "";
    let region: string | null = null;
    if (place.address_components) {
      cityFromAddress =
        addressComponent(place.address_components, "locality") ??
        addressComponent(place.address_components, "postal_town") ??
        addressComponent(place.address_components, "sublocality") ??
        "";
      region = addressComponent(place.address_components, "administrative_area_level_1");
      country = addressComponent(place.address_components, "country") ?? "";
    } else if (place.formatted_address) {
      const parts = place.formatted_address.split(",").map((s) => s.trim()).filter(Boolean);
      country = parts[parts.length - 1] ?? "";
      cityFromAddress = parts.length >= 3 ? parts[parts.length - 3] : (parts[0] ?? "");
    } else if (place.vicinity) {
      const parts = place.vicinity.split(",").map((s) => s.trim()).filter(Boolean);
      cityFromAddress = parts[parts.length - 1] ?? "";
    }

    return {
      id: `${GooglePlacesExperienceProvider.PREFIX}${place.place_id}`,
      slug: `${GooglePlacesExperienceProvider.PREFIX}${place.place_id}`,
      title: place.name,
      description:
        place.editorial_summary?.overview ??
        `${place.name} is a real, live-listed place on Google Maps${place.rating ? ` rated ${place.rating}/5` : ""}. Details here are pulled directly from Google — verify hours and availability before you go.`,
      shortDescription: place.editorial_summary?.overview ?? `A real place near ${cityHint ?? "you"}, sourced live from Google Maps.`,
      category,
      tags: inferTags(place.types),
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
      indoorOutdoor: inferIndoorOutdoor(place.types),
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
      "place_id,name,formatted_address,address_components,geometry,rating,user_ratings_total,price_level,types,photos,opening_hours,editorial_summary,reviews"
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

  async getRelated(source: Experience, limit = 4): Promise<Experience[]> {
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

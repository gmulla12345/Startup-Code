import type { GeocodeResult, PlacesProvider } from "./types";
import { fetchGoogleJson } from "@/lib/google/places-fetch";
import type { UsageContext } from "@/lib/usage/context";

interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: Array<{ long_name: string; types: string[] }>;
  }>;
}

/**
 * Google Geocoding API-backed PlacesProvider. Requires MAPS_API_KEY. Used
 * automatically by the provider factory when the key is present — see
 * services/providers/index.ts. Every request goes through fetchGoogleJson, so
 * it is cached where sensible, limited per user, and logged.
 */
export class GooglePlacesProvider implements PlacesProvider {
  constructor(
    private apiKey: string,
    private usage?: UsageContext
  ) {}

  isLive() {
    return true;
  }

  private parseComponents(result: GoogleGeocodeResponse["results"][number]) {
    const components = result.address_components;
    const find = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? null;
    return {
      city: find("locality") ?? find("postal_town") ?? find("administrative_area_level_2"),
      region: find("administrative_area_level_1"),
      country: find("country"),
    };
  }

  async geocode(query: string): Promise<GeocodeResult | null> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", this.apiKey);

    const response = await fetchGoogleJson<GoogleGeocodeResponse>({
      operation: "geocode",
      url: url.toString(),
      cacheKey: [query.trim().toLowerCase()],
      revalidate: 60 * 60 * 24,
      usage: this.usage,
    });
    const data = response.data;
    if (!response.ok || !data || data.status !== "OK" || data.results.length === 0) return null;

    const result = data.results[0];
    const { city, region, country } = this.parseComponents(result);

    return {
      city: city ?? query,
      region,
      country: country ?? "",
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      source: "google_places",
    };
  }

  // Not cached like geocode() -- every caller passes distinct device
  // coordinates (lat/lng to several decimal places), so a revalidate window
  // would almost never hit and isn't worth the noise.
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", this.apiKey);

    const response = await fetchGoogleJson<GoogleGeocodeResponse>({
      operation: "reverse_geocode",
      url: url.toString(),
      cacheKey: [],
      revalidate: false,
      usage: this.usage,
    });
    const data = response.data;
    if (!response.ok || !data || data.status !== "OK" || data.results.length === 0) return null;

    const result = data.results[0];
    const { city, region, country } = this.parseComponents(result);
    // No recognizable locality at these coordinates (open water, a remote
    // area) -- better to report "couldn't determine" than guess.
    if (!city) return null;

    return {
      city,
      region,
      country: country ?? "",
      // The device's own coordinates, not Google's (possibly snapped-to-
      // address-centroid) geometry -- reverseGeocode's job is only to label
      // where the caller actually is, never to relocate them.
      latitude,
      longitude,
      formattedAddress: result.formatted_address,
      source: "google_places",
    };
  }
}

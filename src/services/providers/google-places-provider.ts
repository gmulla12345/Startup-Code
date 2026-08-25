import type { GeocodeResult, PlacesProvider } from "./types";

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
 * services/providers/index.ts.
 */
export class GooglePlacesProvider implements PlacesProvider {
  constructor(private apiKey: string) {}

  isLive() {
    return true;
  }

  async geocode(query: string): Promise<GeocodeResult | null> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", this.apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;

    const data = (await res.json()) as GoogleGeocodeResponse;
    if (data.status !== "OK" || data.results.length === 0) return null;

    const result = data.results[0];
    const components = result.address_components;
    const find = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? null;

    return {
      city: find("locality") ?? find("postal_town") ?? find("administrative_area_level_2") ?? query,
      region: find("administrative_area_level_1"),
      country: find("country") ?? "",
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      source: "google_places",
    };
  }
}

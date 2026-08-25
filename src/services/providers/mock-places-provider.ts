import type { GeocodeResult, PlacesProvider } from "./types";

/**
 * Small static city gazetteer used when no Maps API key is configured, so
 * onboarding location search and "near me" still work in local dev.
 */
const CITIES: GeocodeResult[] = [
  { city: "Baltimore", region: "MD", country: "USA", latitude: 39.2904, longitude: -76.6122, formattedAddress: "Baltimore, MD, USA", source: "mock" },
  { city: "Washington", region: "DC", country: "USA", latitude: 38.9072, longitude: -77.0369, formattedAddress: "Washington, DC, USA", source: "mock" },
  { city: "New York", region: "NY", country: "USA", latitude: 40.7128, longitude: -74.006, formattedAddress: "New York, NY, USA", source: "mock" },
  { city: "Philadelphia", region: "PA", country: "USA", latitude: 39.9526, longitude: -75.1652, formattedAddress: "Philadelphia, PA, USA", source: "mock" },
  { city: "Boston", region: "MA", country: "USA", latitude: 42.3601, longitude: -71.0589, formattedAddress: "Boston, MA, USA", source: "mock" },
  { city: "Chicago", region: "IL", country: "USA", latitude: 41.8781, longitude: -87.6298, formattedAddress: "Chicago, IL, USA", source: "mock" },
  { city: "Los Angeles", region: "CA", country: "USA", latitude: 34.0522, longitude: -118.2437, formattedAddress: "Los Angeles, CA, USA", source: "mock" },
  { city: "San Francisco", region: "CA", country: "USA", latitude: 37.7749, longitude: -122.4194, formattedAddress: "San Francisco, CA, USA", source: "mock" },
  { city: "Austin", region: "TX", country: "USA", latitude: 30.2672, longitude: -97.7431, formattedAddress: "Austin, TX, USA", source: "mock" },
  { city: "Miami", region: "FL", country: "USA", latitude: 25.7617, longitude: -80.1918, formattedAddress: "Miami, FL, USA", source: "mock" },
  { city: "Seattle", region: "WA", country: "USA", latitude: 47.6062, longitude: -122.3321, formattedAddress: "Seattle, WA, USA", source: "mock" },
  { city: "Denver", region: "CO", country: "USA", latitude: 39.7392, longitude: -104.9903, formattedAddress: "Denver, CO, USA", source: "mock" },
  { city: "Tokyo", region: null, country: "Japan", latitude: 35.6762, longitude: 139.6503, formattedAddress: "Tokyo, Japan", source: "mock" },
  { city: "London", region: null, country: "UK", latitude: 51.5072, longitude: -0.1276, formattedAddress: "London, UK", source: "mock" },
  { city: "Paris", region: null, country: "France", latitude: 48.8566, longitude: 2.3522, formattedAddress: "Paris, France", source: "mock" },
  { city: "Barcelona", region: null, country: "Spain", latitude: 41.3874, longitude: 2.1686, formattedAddress: "Barcelona, Spain", source: "mock" },
];

export class MockPlacesProvider implements PlacesProvider {
  isLive() {
    return false;
  }

  async geocode(query: string): Promise<GeocodeResult | null> {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const exact = CITIES.find((c) => c.city.toLowerCase() === q);
    if (exact) return exact;
    const partial = CITIES.find((c) => c.city.toLowerCase().includes(q) || q.includes(c.city.toLowerCase()));
    return partial ?? null;
  }
}

export function searchMockCities(query: string): GeocodeResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, 8);
  return CITIES.filter((c) => c.city.toLowerCase().includes(q)).slice(0, 8);
}

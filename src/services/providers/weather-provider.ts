import type { WeatherSnapshot } from "@/types/ai";

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number };
}

function codeToCondition(code: number): WeatherSnapshot["condition"] {
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "clouds";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 95) return "storm";
  return "unknown";
}

/**
 * Open-Meteo requires no API key, so it's used as the default "live"
 * weather source. Falls back to a deterministic mock snapshot if the
 * request fails (offline dev, rate limiting, etc.) so callers never have to
 * handle a missing-weather case themselves.
 */
export async function getWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("temperature_unit", "fahrenheit");

    const res = await fetch(url.toString(), { next: { revalidate: 60 * 30 } });
    if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);

    const data = (await res.json()) as OpenMeteoResponse;
    const condition = codeToCondition(data.current.weather_code);

    return {
      condition,
      temperatureF: Math.round(data.current.temperature_2m),
      isGoodForOutdoor: condition === "clear" || (condition === "clouds" && data.current.temperature_2m > 45),
      source: "live",
    };
  } catch {
    return {
      condition: "clear",
      temperatureF: 68,
      isGoodForOutdoor: true,
      source: "mock",
    };
  }
}

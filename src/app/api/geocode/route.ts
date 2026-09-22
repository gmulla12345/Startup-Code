import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getPlacesProvider } from "@/services/providers";
import { searchMockCities } from "@/services/providers/mock-places-provider";

/**
 * Used by onboarding's location step, any "search a city" input, and "use my
 * current location" (via ?lat=&lng= instead of ?q=). Public (no auth) since
 * it's just geocoding, not user data -- but each live call hits Google's
 * billed Geocoding API, so an unauthenticated, unrate-limited version of
 * this route is a real cost-abuse vector (a script could run up the Google
 * Cloud bill with nothing to trace it back to). 30/min per IP is generous
 * enough for legitimate as-you-type autocomplete or a location button click.
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    checkRateLimit(`geocode:${ip}`, 30, 60_000);

    const url = new URL(request.url);
    const provider = getPlacesProvider();

    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");
    if (lat !== null && lng !== null) {
      const latitude = Number(lat);
      const longitude = Number(lng);
      const valid =
        Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
      if (!valid) {
        return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
      }
      const result = await provider.reverseGeocode(latitude, longitude);
      return NextResponse.json({ results: result ? [result] : [], live: provider.isLive() });
    }

    const query = url.searchParams.get("q") ?? "";

    if (!provider.isLive()) {
      return NextResponse.json({ results: searchMockCities(query), live: false });
    }

    const result = await provider.geocode(query);
    return NextResponse.json({ results: result ? [result] : [], live: true });
  });
}

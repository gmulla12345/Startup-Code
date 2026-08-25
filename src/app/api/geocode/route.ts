import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { getPlacesProvider } from "@/services/providers";
import { searchMockCities } from "@/services/providers/mock-places-provider";

/**
 * Used by onboarding's location step and any "search a city" input. Public
 * (no auth) since it's just geocoding, not user data.
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";

    const provider = getPlacesProvider();

    if (!provider.isLive()) {
      return NextResponse.json({ results: searchMockCities(query), live: false });
    }

    const result = await provider.geocode(query);
    return NextResponse.json({ results: result ? [result] : [], live: true });
  });
}

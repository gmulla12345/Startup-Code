import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { getExperienceProvider } from "@/services/providers";
import type { ExperienceCategory } from "@/types/database";

/**
 * Public catalog search — no auth required so the Discover page and public
 * SEO pages can render for logged-out visitors.
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const url = new URL(request.url);
    const params = url.searchParams;

    const provider = await getExperienceProvider();
    const results = await provider.list({
      city: params.get("city") ?? undefined,
      category: (params.get("category") as ExperienceCategory) ?? undefined,
      search: params.get("search") ?? undefined,
      priceLevel: params.get("priceLevel")?.split(",").filter(Boolean),
      indoorOutdoor: params.get("indoorOutdoor") ?? undefined,
      socialMode: params.get("socialMode") ?? undefined,
      hiddenGemsOnly: params.get("hiddenGemsOnly") === "true",
      featuredOnly: params.get("featuredOnly") === "true",
      latitude: params.get("lat") ? Number(params.get("lat")) : undefined,
      longitude: params.get("lng") ? Number(params.get("lng")) : undefined,
      radiusMiles: params.get("radius") ? Number(params.get("radius")) : undefined,
      limit: params.get("limit") ? Number(params.get("limit")) : 60,
    });

    return NextResponse.json({ experiences: results });
  });
}

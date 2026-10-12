import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { CATEGORY_LABELS } from "@/lib/config/categories";
import { getExperienceProvider } from "@/services/providers";
import type { ExperienceCategory } from "@/types/database";

function finiteOrUndefined(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Public catalog search -- no auth required so the Discover page and public
 * SEO pages can render for logged-out visitors.
 *
 * Because it's public AND each distinct lat/lng/search combination fans out
 * into several billed Google Places calls, this is the route a script can run
 * up the Google bill through. So: per-IP rate limit, and every parameter is
 * validated/clamped here (a bad category used to send Google a literal
 * `type=undefined`, billed, returning nothing).
 */
export async function GET(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    checkRateLimit(`experiences:${ip}`, 90, 60_000);

    const url = new URL(request.url);
    const params = url.searchParams;

    const rawCategory = params.get("category");
    const category =
      rawCategory && rawCategory in CATEGORY_LABELS ? (rawCategory as ExperienceCategory) : undefined;

    const latitude = finiteOrUndefined(params.get("lat"));
    const longitude = finiteOrUndefined(params.get("lng"));
    const radius = finiteOrUndefined(params.get("radius"));
    const limit = finiteOrUndefined(params.get("limit"));

    const provider = await getExperienceProvider();
    const results = await provider.list({
      city: params.get("city")?.slice(0, 100) ?? undefined,
      category,
      search: params.get("search")?.slice(0, 80) || undefined,
      priceLevel: params.get("priceLevel")?.split(",").filter(Boolean),
      indoorOutdoor: params.get("indoorOutdoor") ?? undefined,
      socialMode: params.get("socialMode") ?? undefined,
      hiddenGemsOnly: params.get("hiddenGemsOnly") === "true",
      featuredOnly: params.get("featuredOnly") === "true",
      latitude,
      longitude,
      radiusMiles: radius === undefined ? undefined : Math.min(Math.max(radius, 1), 50),
      limit: limit === undefined ? 60 : Math.min(Math.max(Math.floor(limit), 1), 120),
    });

    return NextResponse.json({ experiences: results });
  });
}

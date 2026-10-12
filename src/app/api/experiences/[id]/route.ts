import { NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getExperienceProvider } from "@/services/providers";
import { GooglePlacesExperienceProvider } from "@/services/providers/google-places-experience-provider";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    // Public, and each call can cost two billed Google requests (Place Details
    // plus a related-places search), so it gets the same per-IP cap as the
    // list route.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    checkRateLimit(`experience-detail:${ip}`, 120, 60_000);

    const { id } = await context.params;
    const provider = await getExperienceProvider();

    // A Google-sourced id is both its own id and its own slug, so trying the
    // slug and then the id would send the same billed Details request twice
    // whenever the place doesn't exist.
    const experience = id.startsWith(GooglePlacesExperienceProvider.PREFIX)
      ? await provider.getById(id)
      : ((await provider.getBySlug(id)) ?? (await provider.getById(id)));
    if (!experience) throw new ApiError(404, "Experience not found.");

    const related = await provider.getRelated(experience, 4);
    return NextResponse.json({ experience, related });
  });
}

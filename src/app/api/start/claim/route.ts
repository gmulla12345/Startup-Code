import { NextResponse } from "next/server";
import { ApiError, requireUser, withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { trackAnalytics } from "@/lib/analytics/server";
import { START_CLAIM_LIMIT } from "@/lib/config/start";
import { saveExperience } from "@/lib/repositories/saved";
import { cleanPicks } from "@/lib/start/picks";

/**
 * Keeps a first list in the account that has just been made (or logged into): each
 * place is saved the way the heart on any place saves it, so they appear in Saved and
 * teach the recommendations what the person likes. Saving is idempotent, so asking
 * twice, or for a place already saved, changes nothing. It works with a bearer token
 * too (requireUser), so the mobile app can call it as-is.
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    checkRateLimit(`start-claim:${user.id}`, START_CLAIM_LIMIT.max, START_CLAIM_LIMIT.windowMs);

    const body = (await request.json().catch(() => null)) as { picks?: unknown } | null;
    const picks = cleanPicks(body?.picks);
    if (!picks) throw new ApiError(400, "That is not a list.");

    for (const pick of picks) {
      await saveExperience(supabase, user.id, pick.experienceId, "Saved", pick.tags, pick.category);
      await trackAnalytics("place_saved", { userId: user.id, props: { category: pick.category ?? undefined } });
    }

    return NextResponse.json({ saved: picks.length });
  });
}

import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { trackEvent } from "@/lib/repositories/events";
import { trackEventSchema } from "@/lib/validation/schemas";

/**
 * Generic behavioral event sink used by client components (view, dismiss,
 * share, search, etc.). See src/lib/analytics for the typed client helper
 * that calls this route — nothing should POST here directly.
 */
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = trackEventSchema.parse(await request.json());

    await trackEvent(supabase, user.id, body.eventType, body.experienceId ?? null, body.metadata ?? {});
    return NextResponse.json({ ok: true });
  });
}

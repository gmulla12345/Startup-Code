import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getCurrentUser } from "@/lib/supabase/server";
import { trackAnalytics } from "@/lib/analytics/server";
import { CLIENT_EVENTS, isAnalyticsEvent } from "@/lib/analytics/events";

/**
 * The public measurement endpoint, for events that happen in the browser before
 * there is a server-side moment to record (a /students page view, the start of
 * signup). Deliberately narrow:
 *
 *   - Only the events in CLIENT_EVENTS are accepted. place_saved,
 *     premium_started and the rest are recorded server-side, so they cannot be
 *     forged from here.
 *   - The user is whoever the session cookie says, never anything in the body.
 *   - Properties pass through the same allowlist and token rule as every other
 *     event (see lib/analytics/events.ts): no free text can be stored.
 *   - src and code come from the attribution cookie, not from the request body.
 *   - Obvious crawlers are ignored so page views are not inflated by bots.
 *   - Rate-limited per IP.
 *
 * Separate from /api/analytics/track, which records signed-in behavior into
 * user_events for the recommendation engine.
 */

const BOT = /bot|crawl|spider|slurp|headless|preview|facebookexternalhit|embedly|monitor|lighthouse/i;

const bodySchema = z.object({
  event: z.string().refine(isAnalyticsEvent, "Unknown event."),
  props: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    checkRateLimit(`analytics-event:${ip}`, 60, 60_000);

    // A malformed body is the caller's mistake (400), not a server error.
    const { event, props } = bodySchema.parse(await request.json().catch(() => null));
    if (!CLIENT_EVENTS.includes(event as (typeof CLIENT_EVENTS)[number])) {
      return NextResponse.json({ error: "That event is recorded by the server." }, { status: 400 });
    }

    if (BOT.test(request.headers.get("user-agent") ?? "")) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const user = await getCurrentUser();
    await trackAnalytics(event as (typeof CLIENT_EVENTS)[number], { userId: user?.id ?? null, props: props as never });
    return NextResponse.json({ ok: true });
  });
}

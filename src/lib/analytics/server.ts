import { cookies } from "next/headers";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ATTRIBUTION_COOKIE,
  hasAttribution,
  NO_ATTRIBUTION,
  parseAttribution,
  sanitizeCode,
  sanitizeSrc,
  type Attribution,
} from "@/lib/attribution";
import { sanitizeProps, type AnalyticsEvent, type PropValue } from "./events";

/**
 * Server-side measurement. Writes one row to analytics_events (service role;
 * the table has no client access). Meant to be called from the place the thing
 * actually happens (a route handler, a webhook, a server page), so the client
 * cannot forge it.
 *
 * Attribution on the row, in order:
 *   1. an explicit `attribution` argument,
 *   2. the src/code cookie the proxy captured from the URL,
 *   3. for a known user with neither (a webhook, or a cookie that has
 *      expired), the attribution saved on their profile at signup, so a
 *      payment weeks later still credits the campaign that brought them.
 *
 * Never throws and never blocks: the insert runs after the response (after()),
 * and a failure is logged, not surfaced. A repeated dedupeKey is ignored
 * (the unique index rejects it), which is what makes an event idempotent.
 */

export interface TrackOptions {
  userId?: string | null;
  props?: Record<string, PropValue | null | undefined>;
  /** Makes the event idempotent: the same key is recorded once, ever. */
  dedupeKey?: string;
  attribution?: Attribution;
}

async function readCookieAttribution(): Promise<Attribution> {
  try {
    return parseAttribution((await cookies()).get(ATTRIBUTION_COOKIE)?.value);
  } catch {
    // No request in scope (a script or a cache refresh): no cookie to read.
    return NO_ATTRIBUTION;
  }
}

async function profileAttribution(userId: string): Promise<Attribution> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("signup_src, signup_code")
    .eq("user_id", userId)
    .maybeSingle();
  return { src: sanitizeSrc(data?.signup_src), code: sanitizeCode(data?.signup_code) };
}

export async function trackAnalytics(event: AnalyticsEvent, options: TrackOptions = {}): Promise<void> {
  try {
    const userId = options.userId ?? null;
    const props = sanitizeProps(event, options.props);

    // Read the cookie now, while the request is still in scope.
    const fromRequest = hasAttribution(options.attribution) ? options.attribution : await readCookieAttribution();

    const write = async () => {
      try {
        let attribution = fromRequest;
        if (!hasAttribution(attribution) && userId) attribution = await profileAttribution(userId);

        const { error } = await createAdminClient()
          .from("analytics_events")
          .insert({
            event,
            user_id: userId,
            src: attribution.src,
            code: attribution.code,
            props,
            dedupe_key: options.dedupeKey ?? null,
          });
        // 23505 = the unique dedupe_key: this event was already recorded. Not an error.
        if (error && error.code !== "23505") console.error("[analytics] could not record", event, error.message);
      } catch (err) {
        console.error("[analytics] could not record", event, err);
      }
    };

    try {
      after(write);
    } catch {
      void write();
    }
  } catch (err) {
    console.error("[analytics] trackAnalytics failed:", err);
  }
}

/**
 * Attaches src/code to a brand-new account (see apply_signup_attribution in the
 * database: it only touches an account created in the last 30 minutes that has
 * no attribution yet). Called by the auth callback, because a Google sign-in
 * cannot carry these values in user metadata the way an email signup does.
 */
export async function applySignupAttribution(userId: string, attribution: Attribution): Promise<void> {
  if (!hasAttribution(attribution)) return;
  try {
    const { error } = await createAdminClient().rpc("apply_signup_attribution", {
      p_user: userId,
      p_src: attribution.src,
      p_code: attribution.code,
    });
    if (error) console.error("[analytics] could not apply signup attribution:", error.message);
  } catch (err) {
    console.error("[analytics] could not apply signup attribution:", err);
  }
}

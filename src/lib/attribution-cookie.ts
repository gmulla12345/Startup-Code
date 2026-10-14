import type { NextRequest, NextResponse } from "next/server";
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  attributionFromParams,
  serializeAttribution,
} from "@/lib/attribution";

/**
 * Remembers the ?src= and ?code= a visitor arrives with, for 30 days, in a
 * first-party cookie, so any later event or signup can carry them. Called from
 * the proxy, so it works on every page without JavaScript.
 *
 * A link that carries either value replaces whatever was stored: the most
 * recent campaign link wins (a poster seen after a GroupMe post credits the
 * poster). A request with neither value, or only invalid ones, leaves the
 * cookie alone. Values are validated (lowercase / uppercase tokens only) before
 * they are written, so the cookie can never carry anything else.
 *
 * Not httpOnly on purpose: the signup form reads it to pass src/code into the
 * account's metadata. It holds two campaign labels, nothing personal.
 */
export function captureAttribution(request: NextRequest, response: NextResponse): void {
  const attribution = attributionFromParams(request.nextUrl.searchParams);
  if (!attribution) return;

  response.cookies.set(ATTRIBUTION_COOKIE, serializeAttribution(attribution), {
    maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  });
}

"use client";

import { NO_ATTRIBUTION, attributionFromCookieHeader, type Attribution } from "@/lib/attribution";
import type { AnalyticsEvent, PropValue } from "./events";

/**
 * Browser helpers for measurement. Only the events a browser is allowed to send
 * (CLIENT_EVENTS in ./events) get through the server; the rest are recorded
 * server-side where they happen. Not the same as services/analytics/track.ts,
 * which feeds the personalization log (user_events) for signed-in users.
 */

/** The src/code the proxy captured from the URL, for passing into signup metadata. */
export function readAttribution(): Attribution {
  if (typeof document === "undefined") return NO_ATTRIBUTION;
  return attributionFromCookieHeader(document.cookie);
}

/** Fire-and-forget. A measurement failure must never reach the user. */
export function sendAnalyticsEvent(event: AnalyticsEvent, props?: Record<string, PropValue>): void {
  if (typeof window === "undefined") return;
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, props }),
    keepalive: true,
  }).catch(() => {});
}

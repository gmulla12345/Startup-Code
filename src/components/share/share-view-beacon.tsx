"use client";

import { useEffect } from "react";
import { sendAnalyticsEvent } from "@/lib/analytics/client";
import type { ShareKind } from "@/lib/config/share";

/**
 * Records that a shared link was opened, once per visit. It runs in the browser
 * because the page itself is built once and reused: a server-side count would
 * record the hourly rebuild, not the people. Link-preview crawlers do not run
 * scripts, and the endpoint ignores obvious bots, so previews are not counted as
 * opens. Carries only the kind (place or plan); no token, no person, no text.
 */
export function ShareViewBeacon({ kind }: { kind: ShareKind }) {
  useEffect(() => {
    sendAnalyticsEvent("share_link_opened", { kind });
  }, [kind]);
  return null;
}

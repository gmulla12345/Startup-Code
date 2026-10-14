import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UsageBucket } from "@/lib/config/usage";
import type { UsageContext } from "./context";
import { noteUsage } from "./limits";

export type UsageProvider = "anthropic" | "google_places" | "google_geocoding";
export type UsageOutcome = "ok" | "error" | "blocked";

export interface UsageEvent {
  provider: UsageProvider;
  /** messages | nearby_search | place_details | place_photo | geocode | reverse_geocode */
  operation: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  units?: number;
  /** Estimated USD at list price (0 for an error or a blocked attempt). */
  estCostUsd: number;
  outcome?: UsageOutcome;
}

/**
 * Records one external call in api_usage_events. Fire-and-forget: the insert
 * runs after the response is sent (Next's after()), so logging never adds
 * latency, and a logging failure can never fail the request. Outside a request
 * scope (a background cache refresh, a script) after() isn't available, so the
 * write simply runs unawaited.
 *
 * No PII is recorded: the user id (if any), the feature, the provider call,
 * the model and token counts, and the estimated cost.
 */
export function recordUsage(ctx: UsageContext | undefined, event: UsageEvent): void {
  const outcome = event.outcome ?? "ok";
  const bucket: UsageBucket = event.provider === "anthropic" ? "ai" : "places";
  const units = event.units ?? 1;

  // Count it against today's allowance right away, in this request's memo.
  if (outcome === "ok") noteUsage(ctx, bucket, units);

  const row = {
    user_id: ctx?.userId ?? null,
    provider: event.provider,
    bucket,
    operation: event.operation,
    feature: ctx?.feature ?? "unknown",
    model: event.model ?? null,
    tokens_in: event.tokensIn ?? null,
    tokens_out: event.tokensOut ?? null,
    units,
    est_cost_usd: event.estCostUsd,
    outcome,
  };

  const write = async () => {
    try {
      const { error } = await createAdminClient().from("api_usage_events").insert(row);
      if (error) console.error("[usage] could not log a call:", error.message);
    } catch (err) {
      console.error("[usage] could not log a call:", err);
    }
  };

  try {
    after(write);
  } catch {
    void write();
  }
}

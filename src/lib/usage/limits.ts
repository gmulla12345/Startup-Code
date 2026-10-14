import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_LIMITS, USAGE_TIMEZONE, type UsageBucket } from "@/lib/config/usage";
import type { UsageContext, UsageSnapshot } from "./context";

/**
 * Thrown (or surfaced as a 429 by withErrorHandling) when a user has reached
 * their daily allowance for a bucket. The wording is the product's voice:
 * plain, brief, no exclamation.
 */
export class UsageLimitError extends Error {
  constructor(
    public readonly bucket: UsageBucket,
    public readonly limit: number
  ) {
    super("You have reached today's limit. It resets at midnight, Eastern.");
    this.name = "UsageLimitError";
  }
}

/**
 * Midnight at the start of "today" in USAGE_TIMEZONE, as an instant. (On the
 * two daylight-saving changeover days a year this is off by an hour, which only
 * shifts when a counter resets and does not matter for a spend limit.)
 */
export function startOfUsageDay(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: USAGE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const msIntoDay = ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - msIntoDay);
}

async function loadSnapshot(userId: string): Promise<UsageSnapshot> {
  const admin = createAdminClient();
  const [subscription, usage] = await Promise.all([
    admin.from("subscriptions").select("plan_id, status").eq("user_id", userId).maybeSingle(),
    admin.rpc("usage_units_since", { p_user: userId, p_since: startOfUsageDay().toISOString() }),
  ]);

  const premium =
    subscription.data?.plan_id === "premium" && ["active", "trialing"].includes(subscription.data?.status ?? "");

  const used: Record<UsageBucket, number> = { ai: 0, places: 0 };
  for (const row of (usage.data ?? []) as { bucket: string; units: number | string }[]) {
    if (row.bucket === "ai" || row.bucket === "places") used[row.bucket] = Number(row.units);
  }
  if (usage.error) console.error("[usage] could not read today's usage:", usage.error.message);
  return { premium, used };
}

export interface UsageCheck {
  allowed: boolean;
  limit: number;
  used: number;
}

/**
 * Whether `units` more calls fit inside the user's remaining daily allowance.
 * Anonymous contexts are always allowed (there is no account to count against;
 * their calls are still logged). The first check in a request reads the plan
 * and today's usage once and memoizes it on the context, so a 7-way Places
 * fan-out costs one lookup, not seven.
 *
 * Fails OPEN if the usage lookup itself errors: this is a cost control, not a
 * security boundary, and a database hiccup should not take discovery down.
 */
export async function checkUsage(ctx: UsageContext | undefined, bucket: UsageBucket, units = 1): Promise<UsageCheck> {
  if (!ctx?.userId) return { allowed: true, limit: Infinity, used: 0 };

  try {
    ctx.snapshot ??= loadSnapshot(ctx.userId);
    const snapshot = await ctx.snapshot;
    const limit = DAILY_LIMITS[snapshot.premium ? "premium" : "free"][bucket];
    const used = snapshot.used[bucket];
    return { allowed: used + units <= limit, limit, used };
  } catch (err) {
    console.error("[usage] limit check failed, allowing the call:", err);
    return { allowed: true, limit: Infinity, used: 0 };
  }
}

export async function assertWithinLimit(ctx: UsageContext | undefined, bucket: UsageBucket, units = 1): Promise<void> {
  const check = await checkUsage(ctx, bucket, units);
  if (!check.allowed) throw new UsageLimitError(bucket, check.limit);
}

/** Adds counted units to this request's memoized snapshot so later checks in the same request see them. */
export function noteUsage(ctx: UsageContext | undefined, bucket: UsageBucket, units: number): void {
  void ctx?.snapshot?.then((snapshot) => {
    snapshot.used[bucket] += units;
  });
}

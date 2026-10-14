import type { UsageBucket } from "@/lib/config/usage";

/**
 * Which part of the product triggered an external call. Recorded on every
 * usage row so spend can be read per feature.
 */
export type UsageFeature =
  | "home"
  | "discover"
  | "surprise_me"
  | "weekend_plan"
  | "trip_plan"
  | "itinerary_chat"
  | "itinerary_swap"
  | "saved"
  | "map"
  | "experience_detail"
  | "completed"
  | "travel_guide"
  | "catalog"
  | "photo"
  | "geocode"
  | "share_preview"
  | "unknown";

export interface UsageSnapshot {
  premium: boolean;
  /** Counted units so far today (this request's own calls included). */
  used: Record<UsageBucket, number>;
}

/**
 * Who an external call is for and what triggered it. Created once per request
 * by the caller and passed down to the Places provider and the Claude client.
 * `userId: null` means anonymous (a logged-out visitor or a public route): the
 * call is still logged, but there is no per-user limit to enforce.
 */
export interface UsageContext {
  readonly userId: string | null;
  readonly feature: UsageFeature;
  /** Per-request memo of today's usage, loaded on first limit check (see limits.ts). */
  snapshot?: Promise<UsageSnapshot>;
  /** Per-request memo of today's anonymous usage for this feature (see limits.ts). */
  anonymousUsed?: Promise<number>;
}

export function usageContext(userId: string | null, feature: UsageFeature): UsageContext {
  return { userId, feature };
}

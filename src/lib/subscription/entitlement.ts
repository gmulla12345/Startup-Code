import type { Subscription } from "@/types/database";
import { isInPausedMonth } from "./pause";

/**
 * Whether someone has Premium, as a pure function of their stored subscription: no database, no React, so the
 * profile card (a client component) and the server can both use it. The repository re-exports these.
 */

/** Whether this person has a live Premium subscription at all, including one whose paused month is under way. */
export function hasSubscription(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.planId === "premium" && ["active", "trialing"].includes(subscription.status);
}

/** Whether Premium is in effect right now: a live subscription, outside the one skipped month of a pause. */
export function isPremium(subscription: Subscription | null, now: Date = new Date()): boolean {
  return hasSubscription(subscription) && !isInPausedMonth(subscription!, now);
}

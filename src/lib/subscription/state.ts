import type { Subscription } from "@/types/database";
import { isStudentPriceId } from "@/lib/config/pricing";
import { hasSubscription } from "./entitlement";
import { pauseState } from "./pause";

/**
 * What to tell a person about their subscription, in one place: the profile card and the cancel screen both read it.
 * "premium" is Premium in effect and untouched; the others are the states a cancel or a pause leaves behind.
 */
export type SubscriptionView =
  | { kind: "free" }
  | { kind: "premium"; student: boolean; managedBy: "stripe" | "digistore24" }
  | { kind: "ending"; endsOn: string | null; student: boolean }
  | { kind: "pause_scheduled"; from: string; until: string; student: boolean }
  | { kind: "paused"; until: string; student: boolean };

export function describeSubscription(sub: Subscription | null, now: Date = new Date()): SubscriptionView {
  if (!sub || !hasSubscription(sub)) return { kind: "free" };
  const student = isStudentPriceId(sub.stripePriceId);
  const pause = pauseState(sub, now);
  if (pause === "paused" && sub.pausedUntil) return { kind: "paused", until: sub.pausedUntil, student };
  if (sub.cancelAtPeriodEnd) return { kind: "ending", endsOn: sub.currentPeriodEnd, student };
  if (pause === "scheduled" && sub.pausedFrom && sub.pausedUntil) return { kind: "pause_scheduled", from: sub.pausedFrom, until: sub.pausedUntil, student };
  return { kind: "premium", student, managedBy: sub.digistore24ManageUrl ? "digistore24" : "stripe" };
}

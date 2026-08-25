"use client";

import type { UserEventType } from "@/types/database";

/**
 * Fire-and-forget behavioral event tracking from client components. Backed
 * today by src/app/api/analytics/track -> user_events table, which also
 * feeds the recommendation engine. Swapping in a third-party analytics
 * provider (PostHog, Amplitude, Segment) later means changing only this
 * file — call sites stay the same.
 */
export function track(eventType: UserEventType, experienceId?: string | null, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, experienceId: experienceId ?? null, metadata }),
    keepalive: true,
  }).catch(() => {
    // Analytics failures should never surface to the user.
  });
}

export const analyticsEvents = {
  signupCompleted: () => track("changed_preference", null, { event: "signup_completed" }),
  onboardingCompleted: () => track("changed_preference", null, { event: "onboarding_completed" }),
  recommendationClicked: (id: string) => track("viewed_experience", id, { source: "recommendation" }),
  searchPerformed: (query: string) => track("searched_category", null, { query }),
} as const;

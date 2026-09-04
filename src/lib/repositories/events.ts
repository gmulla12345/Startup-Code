import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserEvent, UserEventType } from "@/types/database";

export async function trackEvent(
  client: SupabaseClient,
  userId: string,
  eventType: UserEventType,
  experienceId: string | null = null,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await client.from("user_events").insert({
    user_id: userId,
    event_type: eventType,
    experience_id: experienceId,
    metadata,
  });
  if (error) console.error("[events] trackEvent failed:", error.message);
}

export async function getRecentEvents(
  client: SupabaseClient,
  userId: string,
  limit = 50
): Promise<UserEvent[]> {
  const { data, error } = await client
    .from("user_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    experienceId: row.experience_id,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

export function summarizeEventsForAI(events: UserEvent[]): string[] {
  const summaries: string[] = [];
  const saved = events.filter((e) => e.eventType === "saved_experience").length;
  const dismissed = events.filter((e) => e.eventType === "dismissed_experience").length;
  const viewed = events.filter((e) => e.eventType === "viewed_experience").length;
  if (saved > 0) summaries.push(`Saved ${saved} experience(s) recently`);
  if (dismissed > 0) summaries.push(`Dismissed ${dismissed} recommendation(s) recently`);
  if (viewed > 0) summaries.push(`Viewed ${viewed} experience(s) recently`);
  return summaries;
}

export function idSetForEventType(events: UserEvent[], type: UserEventType): Set<string> {
  return new Set(events.filter((e) => e.eventType === type && e.experienceId).map((e) => e.experienceId!));
}

/**
 * Targeted history lookup for one event type, independent of
 * getRecentEvents' shared 100-row window (which mixes in every event type
 * and would miss older surprise_me_requested rows for an active user).
 * Used to keep Surprise Me from repeating a spot it's already shown someone.
 */
export async function getEventExperienceIds(
  client: SupabaseClient,
  userId: string,
  eventType: UserEventType,
  limit = 300
): Promise<Set<string>> {
  const { data, error } = await client
    .from("user_events")
    .select("experience_id")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .not("experience_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return new Set();
  return new Set(data.map((row) => row.experience_id as string).filter(Boolean));
}

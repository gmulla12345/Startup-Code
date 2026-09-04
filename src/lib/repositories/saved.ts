import type { SupabaseClient } from "@supabase/supabase-js";
import type { SavedExperience } from "@/types/database";

function rowToSaved(row: Record<string, unknown>): SavedExperience {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    experienceId: row.experience_id as string,
    collection: row.collection as string,
    status: row.status as SavedExperience["status"],
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
  };
}

export async function listSaved(client: SupabaseClient, userId: string): Promise<SavedExperience[]> {
  const { data, error } = await client
    .from("saved_experiences")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToSaved);
}

export async function saveExperience(
  client: SupabaseClient,
  userId: string,
  experienceId: string,
  collection = "Saved",
  tags: string[] = [],
  category: string | null = null
): Promise<SavedExperience> {
  const { data, error } = await client
    .from("saved_experiences")
    .upsert(
      { user_id: userId, experience_id: experienceId, collection, tags, category },
      { onConflict: "user_id,experience_id,collection" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`saveExperience: ${error.message}`);
  return rowToSaved(data);
}

export async function unsaveExperience(
  client: SupabaseClient,
  userId: string,
  experienceId: string,
  collection = "Saved"
): Promise<void> {
  const { error } = await client
    .from("saved_experiences")
    .delete()
    .eq("user_id", userId)
    .eq("experience_id", experienceId)
    .eq("collection", collection);
  if (error) throw new Error(`unsaveExperience: ${error.message}`);
}

/**
 * Tag and category frequency across a user's saved experiences, used to
 * bias future recommendations toward what they keep saving. Reads
 * saved_experiences.tags/category directly (denormalized at save time by
 * saveExperience()) rather than joining into public.experiences — that
 * table is empty in production (Google Places results are fetched live and
 * never persisted there), so a join-based lookup would silently return
 * nothing for the vast majority of real saves. This used to be exactly that
 * broken join; fixed 2026-09-04 alongside the rest of the taste-learning
 * pass — see CLAUDE.md.
 */
export async function getSavedTagCounts(
  client: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  const { data: saved, error } = await client.from("saved_experiences").select("tags").eq("user_id", userId);
  if (error || !saved) return {};

  const counts: Record<string, number> = {};
  for (const row of saved) {
    for (const tag of (row.tags as string[]) ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

export async function getSavedCategoryCounts(
  client: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  const { data: saved, error } = await client.from("saved_experiences").select("category").eq("user_id", userId);
  if (error || !saved) return {};

  const counts: Record<string, number> = {};
  for (const row of saved) {
    const category = row.category as string | null;
    if (category) counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

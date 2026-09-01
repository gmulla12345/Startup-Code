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
  collection = "Saved"
): Promise<SavedExperience> {
  const { data, error } = await client
    .from("saved_experiences")
    .upsert(
      { user_id: userId, experience_id: experienceId, collection },
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
 * Tag frequency across a user's saved experiences, used to bias future
 * recommendations toward tags they keep saving. Does a manual two-step
 * lookup instead of an embedded `.select("experiences(tags)")` join because
 * saved_experiences.experience_id is plain text with no FK (see schema.sql
 * — it has to hold Google Places ids like "g-ChIJ...", not just uuids).
 * Only uuid-shaped ids can have a row in public.experiences at all — Google
 * Places results are fetched live and never persisted there, and don't
 * carry tags to begin with, so there's nothing to look up for them.
 */
export async function getSavedTagCounts(
  client: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  const { data: saved, error } = await client
    .from("saved_experiences")
    .select("experience_id")
    .eq("user_id", userId);
  if (error || !saved || saved.length === 0) return {};

  const uuidIds = saved
    .map((row) => row.experience_id as string)
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (uuidIds.length === 0) return {};

  const { data: experiences } = await client.from("experiences").select("tags").in("id", uuidIds);

  const counts: Record<string, number> = {};
  for (const row of experiences ?? []) {
    for (const tag of (row.tags as string[]) ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

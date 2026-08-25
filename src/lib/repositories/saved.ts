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

export async function getSavedTagCounts(
  client: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await client
    .from("saved_experiences")
    .select("experiences(tags)")
    .eq("user_id", userId);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data as unknown as { experiences: { tags: string[] } | null }[]) {
    for (const tag of row.experiences?.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

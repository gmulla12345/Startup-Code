import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/types/database";

export async function getReviewsForExperience(client: SupabaseClient, experienceId: string): Promise<Review[]> {
  try {
    const { data, error } = await client
      .from("reviews")
      .select("*")
      .eq("experience_id", experienceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      experienceId: row.experience_id,
      userId: row.user_id,
      authorName: row.author_name,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

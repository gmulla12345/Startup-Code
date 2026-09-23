import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review } from "@/types/database";

function rowToReview(row: {
  id: string;
  experience_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}): Review {
  return {
    id: row.id,
    experienceId: row.experience_id,
    userId: row.user_id,
    authorName: row.author_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export async function getReviewsForExperience(client: SupabaseClient, experienceId: string): Promise<Review[]> {
  try {
    const { data, error } = await client
      .from("reviews")
      .select("*")
      .eq("experience_id", experienceId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return [];

    return data.map(rowToReview);
  } catch {
    return [];
  }
}

/**
 * Writes a new community note. `authorName` is the caller's real profile
 * first name, resolved server-side by the route handler -- never taken
 * from client input, so a note can't be posted under a name the poster
 * doesn't actually have (the RLS policy "users insert own reviews" already
 * ties `user_id` to the authenticated session; this closes the matching
 * gap for the free-text display name column).
 */
export async function createReview(
  client: SupabaseClient,
  userId: string,
  authorName: string,
  experienceId: string,
  rating: number,
  comment: string
): Promise<Review> {
  const { data, error } = await client
    .from("reviews")
    .insert({ user_id: userId, author_name: authorName, experience_id: experienceId, rating, comment })
    .select("*")
    .single();

  if (error || !data) throw new Error(`createReview: ${error?.message}`);
  return rowToReview(data);
}

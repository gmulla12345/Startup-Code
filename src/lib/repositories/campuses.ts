import { createPublicClient } from "@/lib/supabase/public";
import { FALLBACK_CAMPUSES, type Campus } from "@/lib/campus";

/**
 * The active campuses, in the order the selector shows them. Reads the public
 * `campuses` table with the cookie-free client, so a page that only needs this
 * can still be statically generated. If the table cannot be read (or is empty),
 * the page falls back to the seeded list rather than failing to build.
 */
export async function getActiveCampuses(): Promise<Campus[]> {
  try {
    const { data, error } = await createPublicClient()
      .from("campuses")
      .select("slug, name, short_name, email_domains")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return FALLBACK_CAMPUSES;
    return data.map((row) => ({
      slug: row.slug as string,
      name: row.name as string,
      shortName: row.short_name as string,
      emailDomains: row.email_domains as string[],
    }));
  } catch {
    return FALLBACK_CAMPUSES;
  }
}

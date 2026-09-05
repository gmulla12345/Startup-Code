import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experience } from "@/types/database";
import { distanceMiles } from "@/lib/utils/geo";
import type { ExperienceProvider, ExperienceQuery } from "./types";

function rowToExperience(row: Record<string, unknown>): Experience {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    shortDescription: row.short_description as string,
    category: row.category as Experience["category"],
    tags: (row.tags as Experience["tags"]) ?? [],
    images: (row.images as string[]) ?? [],
    city: row.city as string,
    region: row.region as string | null,
    country: row.country as string,
    address: row.address as string | null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    priceLevel: row.price_level as Experience["priceLevel"],
    priceEstimate: row.price_estimate != null ? Number(row.price_estimate) : null,
    priceCurrency: row.price_currency as string,
    durationMinutes: row.duration_minutes as number | null,
    indoorOutdoor: row.indoor_outdoor as Experience["indoorOutdoor"],
    socialMode: row.social_mode as Experience["socialMode"],
    bestTimeOfDay: row.best_time_of_day as Experience["bestTimeOfDay"],
    rating: row.rating != null ? Number(row.rating) : null,
    reviewCount: (row.review_count as number) ?? 0,
    isHiddenGem: Boolean(row.is_hidden_gem),
    isFeatured: Boolean(row.is_featured),
    isPremium: Boolean(row.is_premium),
    externalBookingUrl: row.external_booking_url as string | null,
    sourceProvider: row.source_provider as Experience["sourceProvider"],
    sourceId: row.source_id as string | null,
    requirements: (row.requirements as string[]) ?? [],
    availability: row.availability as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Reads the experience catalog from Supabase Postgres. Falls through to
 * client-side filtering for a couple of fields (radius, tag overlap) that
 * are awkward to express portably in PostgREST filters at this scale.
 *
 * `source_provider = 'mock'` rows are fictional demo/seed content (invented
 * tours, stock photos) and are excluded from every query below, always —
 * not just because the seed rows were deleted from production. This is a
 * deliberate guardrail so re-running scripts/seed-supabase.ts, or an admin
 * accidentally re-importing seed data, can never put fabricated listings
 * back in front of real users. That content is only meant to power
 * MockExperienceProvider for zero-credential local dev.
 */
export class SupabaseExperienceProvider implements ExperienceProvider {
  constructor(private client: SupabaseClient) {}

  async list(query: ExperienceQuery): Promise<Experience[]> {
    let q = this.client.from("experiences").select("*").neq("source_provider", "mock");

    if (query.city) q = q.ilike("city", `%${query.city}%`);
    if (query.category) q = q.eq("category", query.category);
    if (query.priceLevel && query.priceLevel.length > 0) q = q.in("price_level", query.priceLevel);
    if (query.indoorOutdoor && query.indoorOutdoor !== "either") q = q.eq("indoor_outdoor", query.indoorOutdoor);
    if (query.hiddenGemsOnly) q = q.eq("is_hidden_gem", true);
    if (query.featuredOnly) q = q.eq("is_featured", true);
    if (query.search) q = q.ilike("title", `%${query.search}%`);
    // excludeIds can contain Google Places-sourced ids (prefixed "g-", not a
    // uuid) mixed in with real ones — this table's id column is uuid, so
    // passing a non-uuid string into `.not("id", "in", ...)` throws a
    // Postgres type error. That error used to get silently swallowed by
    // ResilientExperienceProvider and served fictional mock data instead
    // (a real regression — see CLAUDE.md, "Production catalog is Google
    // Places-only"), so only ever pass ids this table could actually contain.
    const uuidExcludeIds = query.excludeIds?.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );
    if (uuidExcludeIds && uuidExcludeIds.length > 0) q = q.not("id", "in", `(${uuidExcludeIds.join(",")})`);

    const { data, error } = await q.limit(500);
    if (error) throw new Error(`SupabaseExperienceProvider.list: ${error.message}`);

    let results = (data ?? []).map(rowToExperience);

    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) => query.tags!.some((t) => e.tags.includes(t as never)));
    }

    if (query.socialMode && query.socialMode !== "either") {
      results = results.filter((e) => e.socialMode === query.socialMode || e.socialMode === "either");
    }

    if (query.latitude != null && query.longitude != null) {
      const radius = query.radiusMiles ?? 10000;
      results = results
        .map((e) => ({ e, d: distanceMiles(query.latitude!, query.longitude!, e.latitude, e.longitude) }))
        .filter(({ d }) => d <= radius)
        .sort((a, b) => a.d - b.d)
        .map(({ e }) => e);
    }

    return results.slice(0, query.limit ?? 100);
  }

  async getById(id: string): Promise<Experience | null> {
    const { data, error } = await this.client
      .from("experiences")
      .select("*")
      .eq("id", id)
      .neq("source_provider", "mock")
      .maybeSingle();
    if (error || !data) return null;
    return rowToExperience(data);
  }

  async getBySlug(slug: string): Promise<Experience | null> {
    const { data, error } = await this.client
      .from("experiences")
      .select("*")
      .eq("slug", slug)
      .neq("source_provider", "mock")
      .maybeSingle();
    if (error || !data) return null;
    return rowToExperience(data);
  }

  async getRelated(source: Experience, limit = 4): Promise<Experience[]> {
    const { data, error } = await this.client
      .from("experiences")
      .select("*")
      .eq("category", source.category)
      .neq("id", source.id)
      .neq("source_provider", "mock")
      .limit(limit);
    if (error) return [];
    return (data ?? []).map(rowToExperience);
  }
}

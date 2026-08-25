/**
 * Populates a real Supabase database with the same demo catalog the app
 * uses for zero-config local dev (src/db/seed-data.ts). Run once after
 * applying src/db/schema.sql:
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { config } from "dotenv";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES, EXPERIENCES, DESTINATIONS } from "../src/db/seed-data";

config({ path: join(__dirname, "../.env.local") });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`Seeding ${CATEGORIES.length} categories...`);
  const { error: catError } = await supabase.from("experience_categories").upsert(
    CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon, sort_order: c.sortOrder })),
    { onConflict: "id" }
  );
  if (catError) throw catError;

  console.log(`Seeding ${EXPERIENCES.length} experiences...`);
  const { error: expError } = await supabase.from("experiences").upsert(
    EXPERIENCES.map((e) => ({
      slug: e.slug,
      title: e.title,
      description: e.description,
      short_description: e.shortDescription,
      category: e.category,
      tags: e.tags,
      images: e.images,
      city: e.city,
      region: e.region,
      country: e.country,
      address: e.address,
      latitude: e.latitude,
      longitude: e.longitude,
      price_level: e.priceLevel,
      price_estimate: e.priceEstimate,
      price_currency: e.priceCurrency,
      duration_minutes: e.durationMinutes,
      indoor_outdoor: e.indoorOutdoor,
      social_mode: e.socialMode,
      best_time_of_day: e.bestTimeOfDay,
      rating: e.rating,
      review_count: e.reviewCount,
      is_hidden_gem: e.isHiddenGem,
      is_featured: e.isFeatured,
      is_premium: e.isPremium,
      external_booking_url: e.externalBookingUrl,
      source_provider: e.sourceProvider,
      source_id: e.sourceId,
      requirements: e.requirements,
      availability: e.availability,
    })),
    { onConflict: "slug" }
  );
  if (expError) throw expError;

  console.log(`Seeding ${DESTINATIONS.length} destinations...`);
  const { error: destError } = await supabase.from("destinations").upsert(
    DESTINATIONS.map((d) => ({
      slug: d.slug,
      city: d.city,
      country: d.country,
      description: d.description,
      cover_image: d.coverImage,
      latitude: d.latitude,
      longitude: d.longitude,
      best_months: d.bestMonths,
    })),
    { onConflict: "slug" }
  );
  if (destError) throw destError;

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

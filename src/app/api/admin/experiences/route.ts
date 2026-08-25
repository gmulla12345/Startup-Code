import { NextResponse } from "next/server";
import { requireAdmin, withErrorHandling } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const experienceInputSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  city: z.string().min(1),
  region: z.string().nullable().optional(),
  country: z.string().min(1),
  address: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  priceLevel: z.enum(["free", "low", "medium", "high", "luxury"]),
  priceEstimate: z.number().nullable().optional(),
  durationMinutes: z.number().nullable().optional(),
  indoorOutdoor: z.enum(["indoor", "outdoor", "either"]),
  socialMode: z.enum(["solo", "group", "either"]),
  bestTimeOfDay: z.enum(["morning", "afternoon", "evening", "night", "any"]),
  isHiddenGem: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  externalBookingUrl: z.string().nullable().optional(),
  requirements: z.array(z.string()).default([]),
  availability: z.string().nullable().optional(),
});

function toRow(input: z.infer<typeof experienceInputSchema>) {
  return { ...toPartialRow(input), source_provider: "manual" };
}

/** Only includes keys actually present in `input` — used for PATCH so an
 * untouched field is never silently overwritten (e.g. toggling "featured"
 * must not reset source_provider on a seeded experience). */
function toPartialRow(input: Partial<z.infer<typeof experienceInputSchema>>) {
  const row: Record<string, unknown> = {};
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.shortDescription !== undefined) row.short_description = input.shortDescription;
  if (input.category !== undefined) row.category = input.category;
  if (input.tags !== undefined) row.tags = input.tags;
  if (input.images !== undefined) row.images = input.images;
  if (input.city !== undefined) row.city = input.city;
  if (input.region !== undefined) row.region = input.region;
  if (input.country !== undefined) row.country = input.country;
  if (input.address !== undefined) row.address = input.address;
  if (input.latitude !== undefined) row.latitude = input.latitude;
  if (input.longitude !== undefined) row.longitude = input.longitude;
  if (input.priceLevel !== undefined) row.price_level = input.priceLevel;
  if (input.priceEstimate !== undefined) row.price_estimate = input.priceEstimate;
  if (input.durationMinutes !== undefined) row.duration_minutes = input.durationMinutes;
  if (input.indoorOutdoor !== undefined) row.indoor_outdoor = input.indoorOutdoor;
  if (input.socialMode !== undefined) row.social_mode = input.socialMode;
  if (input.bestTimeOfDay !== undefined) row.best_time_of_day = input.bestTimeOfDay;
  if (input.isHiddenGem !== undefined) row.is_hidden_gem = input.isHiddenGem;
  if (input.isFeatured !== undefined) row.is_featured = input.isFeatured;
  if (input.isPremium !== undefined) row.is_premium = input.isPremium;
  if (input.externalBookingUrl !== undefined) row.external_booking_url = input.externalBookingUrl;
  if (input.requirements !== undefined) row.requirements = input.requirements;
  if (input.availability !== undefined) row.availability = input.availability;
  return row;
}

export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin.from("experiences").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ experiences: data ?? [] });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    await requireAdmin();
    const body = experienceInputSchema.parse(await request.json());
    const admin = createAdminClient();

    const { data, error } = await admin.from("experiences").insert(toRow(body)).select("*").single();
    if (error) throw error;
    return NextResponse.json({ experience: data });
  });
}

export async function PATCH(request: Request) {
  return withErrorHandling(async () => {
    await requireAdmin();
    const body = (await request.json()) as { id: string } & Partial<z.infer<typeof experienceInputSchema>>;
    const { id, ...rest } = body;
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("experiences")
      .update(toPartialRow(experienceInputSchema.partial().parse(rest)))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ experience: data });
  });
}

export async function DELETE(request: Request) {
  return withErrorHandling(async () => {
    await requireAdmin();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("experiences").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  });
}

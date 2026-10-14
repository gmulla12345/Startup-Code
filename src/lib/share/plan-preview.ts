import { createAdminClient } from "@/lib/supabase/admin";
import { SHARE_PLAN_MAX_ITEMS } from "@/lib/config/share";

/**
 * What a shared plan shows: the plan's own title, how many stops and days, and each
 * stop's time, name and note. Read on the server for the one plan a share link
 * points at.
 *
 * Deliberately NOT shown, whatever the plan holds: calendar dates (a trip's dates
 * say when someone is away from home), coordinates, photos (each is a billed Google
 * photo request, and not needed to say what a plan is), the plan's id, and who made
 * it unless they opted in to showing their first name.
 *
 * The stop names are the ones saved with the plan when it was made. They came from
 * Google Places at that time, so showing them publicly is part of the open question
 * about stored place names (see CLAUDE.md, "Phase 4"); the link itself stores none.
 */

export interface PlanStop {
  time: string;
  title: string;
  note: string | null;
}

export interface PlanDay {
  label: string;
  stops: PlanStop[];
}

export interface PlanPreview {
  title: string;
  type: "weekend" | "day_trip" | "travel" | "custom";
  city: string | null;
  country: string | null;
  dayCount: number;
  stopCount: number;
  estimatedCost: number | null;
  days: PlanDay[];
  /** True when the plan had more stops than are shown. */
  truncated: boolean;
}

interface ItemRow {
  day_index: number;
  order_index: number;
  start_time: string | null;
  title: string | null;
  notes: string | null;
}

const clip = (value: string | null | undefined, max: number) => {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return [...text].slice(0, max).join("");
};

/** Pure: builds the preview from the stored rows. */
export function toPlanPreview(
  itinerary: {
    title: string;
    type: PlanPreview["type"];
    destination_city: string | null;
    destination_country: string | null;
    estimated_cost: number | string | null;
  },
  items: ItemRow[]
): PlanPreview {
  const ordered = [...items].sort((a, b) => a.day_index - b.day_index || a.order_index - b.order_index);
  const shown = ordered.slice(0, SHARE_PLAN_MAX_ITEMS);

  const byDay = new Map<number, PlanStop[]>();
  for (const item of shown) {
    const stops = byDay.get(item.day_index) ?? [];
    stops.push({
      time: clip(item.start_time, 8),
      title: clip(item.title, 120) || "A stop",
      note: clip(item.notes, 240) || null,
    });
    byDay.set(item.day_index, stops);
  }

  const days = [...byDay.keys()]
    .sort((a, b) => a - b)
    .map((dayIndex, i) => ({ label: `Day ${i + 1}`, stops: byDay.get(dayIndex)! }));

  const cost = itinerary.estimated_cost == null ? null : Number(itinerary.estimated_cost);
  return {
    title: clip(itinerary.title, 120) || "A plan",
    type: itinerary.type,
    city: clip(itinerary.destination_city, 80) || null,
    country: clip(itinerary.destination_country, 80) || null,
    dayCount: days.length,
    stopCount: ordered.length,
    estimatedCost: cost != null && Number.isFinite(cost) && cost > 0 ? cost : null,
    days,
    truncated: ordered.length > shown.length,
  };
}

/** Reads the plan a share link points at. Null if it no longer exists. */
export async function loadPlanPreview(itineraryId: string): Promise<PlanPreview | null> {
  const admin = createAdminClient();
  const { data: itinerary, error } = await admin
    .from("itineraries")
    .select("title, type, destination_city, destination_country, estimated_cost")
    .eq("id", itineraryId)
    .maybeSingle();
  if (error) throw new Error(`[share] could not read the plan: ${error.message}`);
  if (!itinerary) return null;

  const { data: items, error: itemsError } = await admin
    .from("itinerary_items")
    .select("day_index, order_index, start_time, title, notes")
    .eq("itinerary_id", itineraryId);
  if (itemsError) throw new Error(`[share] could not read the plan's stops: ${itemsError.message}`);

  return toPlanPreview(itinerary as Parameters<typeof toPlanPreview>[0], (items ?? []) as ItemRow[]);
}

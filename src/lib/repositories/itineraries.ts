import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { Itinerary, ItineraryItem } from "@/types/database";
import type { WeekendPlan } from "@/types/ai";

function rowToItinerary(row: Record<string, unknown>): Itinerary {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    type: row.type as Itinerary["type"],
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    isPublic: Boolean(row.is_public),
    shareSlug: row.share_slug as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToItem(row: Record<string, unknown>): ItineraryItem {
  return {
    id: row.id as string,
    itineraryId: row.itinerary_id as string,
    experienceId: row.experience_id as string | null,
    dayIndex: row.day_index as number,
    startTime: row.start_time as string,
    title: row.title as string,
    notes: row.notes as string | null,
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    orderIndex: row.order_index as number,
  };
}

export async function saveWeekendPlanAsItinerary(
  client: SupabaseClient,
  userId: string,
  title: string,
  plan: WeekendPlan
): Promise<{ itinerary: Itinerary; items: ItineraryItem[] }> {
  const dayIndexByLabel = new Map<string, number>();
  let nextDayIndex = 0;

  const { data: itineraryRow, error: itineraryError } = await client
    .from("itineraries")
    .insert({
      user_id: userId,
      title,
      type: "weekend",
      estimated_cost: plan.totalEstimatedCost,
      is_public: false,
      share_slug: randomUUID().slice(0, 8),
    })
    .select("*")
    .single();

  if (itineraryError) throw new Error(`saveWeekendPlanAsItinerary: ${itineraryError.message}`);

  const itemsPayload = plan.items.map((item, index) => {
    if (!dayIndexByLabel.has(item.day)) dayIndexByLabel.set(item.day, nextDayIndex++);
    return {
      itinerary_id: itineraryRow.id,
      experience_id: item.experienceId,
      day_index: dayIndexByLabel.get(item.day)!,
      start_time: item.startTime,
      title: item.title,
      notes: item.notes,
      estimated_cost: item.estimatedCost,
      order_index: index,
    };
  });

  const { data: itemRows, error: itemsError } = await client
    .from("itinerary_items")
    .insert(itemsPayload)
    .select("*");

  if (itemsError) throw new Error(`saveWeekendPlanAsItinerary items: ${itemsError.message}`);

  return {
    itinerary: rowToItinerary(itineraryRow),
    items: (itemRows ?? []).map(rowToItem),
  };
}

export async function listItineraries(client: SupabaseClient, userId: string): Promise<Itinerary[]> {
  const { data, error } = await client
    .from("itineraries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listItineraries: ${error.message}`);
  return (data ?? []).map(rowToItinerary);
}

export async function getItineraryWithItems(
  client: SupabaseClient,
  idOrShareSlug: string
): Promise<{ itinerary: Itinerary; items: ItineraryItem[] } | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrShareSlug);
  const { data: itineraryRow, error } = await client
    .from("itineraries")
    .select("*")
    .eq(isUuid ? "id" : "share_slug", idOrShareSlug)
    .maybeSingle();
  if (error || !itineraryRow) return null;

  const { data: itemRows } = await client
    .from("itinerary_items")
    .select("*")
    .eq("itinerary_id", itineraryRow.id)
    .order("order_index", { ascending: true });

  return { itinerary: rowToItinerary(itineraryRow), items: (itemRows ?? []).map(rowToItem) };
}

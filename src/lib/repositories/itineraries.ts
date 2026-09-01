import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type { Itinerary, ItineraryItem } from "@/types/database";
import type { TripPlan, WeekendPlan } from "@/types/ai";

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
    destinationCity: row.destination_city as string | null,
    destinationCountry: row.destination_country as string | null,
    destinationLatitude: row.destination_latitude != null ? Number(row.destination_latitude) : null,
    destinationLongitude: row.destination_longitude != null ? Number(row.destination_longitude) : null,
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
    images: (row.images as string[]) ?? [],
  };
}

export async function saveWeekendPlanAsItinerary(
  client: SupabaseClient,
  userId: string,
  title: string,
  plan: WeekendPlan
): Promise<{ itinerary: Itinerary; items: ItineraryItem[] }> {
  return saveItinerary(client, userId, { title, type: "weekend", plan });
}

export async function saveTripPlanAsItinerary(
  client: SupabaseClient,
  userId: string,
  title: string,
  plan: TripPlan,
  dates: { startDate: string; endDate: string },
  destination: { city: string; country: string; latitude: number; longitude: number }
): Promise<{ itinerary: Itinerary; items: ItineraryItem[] }> {
  return saveItinerary(client, userId, {
    title,
    type: "travel",
    plan,
    ...dates,
    destinationCity: destination.city,
    destinationCountry: destination.country,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
  });
}

async function saveItinerary(
  client: SupabaseClient,
  userId: string,
  opts: {
    title: string;
    type: Itinerary["type"];
    plan: WeekendPlan | TripPlan;
    startDate?: string;
    endDate?: string;
    destinationCity?: string;
    destinationCountry?: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
  }
): Promise<{ itinerary: Itinerary; items: ItineraryItem[] }> {
  const { title, type, plan, startDate, endDate, destinationCity, destinationCountry, destinationLatitude, destinationLongitude } = opts;
  const dayIndexByLabel = new Map<string, number>();
  let nextDayIndex = 0;

  const { data: itineraryRow, error: itineraryError } = await client
    .from("itineraries")
    .insert({
      user_id: userId,
      title,
      type,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      estimated_cost: plan.totalEstimatedCost,
      is_public: false,
      share_slug: randomUUID().slice(0, 8),
      destination_city: destinationCity ?? null,
      destination_country: destinationCountry ?? null,
      destination_latitude: destinationLatitude ?? null,
      destination_longitude: destinationLongitude ?? null,
    })
    .select("*")
    .single();

  if (itineraryError) throw new Error(`saveItinerary: ${itineraryError.message}`);

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
      images: item.images ?? [],
    };
  });

  const { data: itemRows, error: itemsError } = await client
    .from("itinerary_items")
    .insert(itemsPayload)
    .select("*");

  if (itemsError) throw new Error(`saveItinerary items: ${itemsError.message}`);

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

/** Throws if the itinerary doesn't exist or isn't owned by userId. */
async function requireOwnedItinerary(client: SupabaseClient, itineraryId: string, userId: string): Promise<void> {
  const { data, error } = await client.from("itineraries").select("user_id").eq("id", itineraryId).maybeSingle();
  if (error || !data) throw new Error("Itinerary not found.");
  if (data.user_id !== userId) throw new Error("Not authorized to edit this itinerary.");
}

export async function deleteItineraryItem(
  client: SupabaseClient,
  itineraryId: string,
  itemId: string,
  userId: string
): Promise<void> {
  await requireOwnedItinerary(client, itineraryId, userId);
  const { error } = await client.from("itinerary_items").delete().eq("id", itemId).eq("itinerary_id", itineraryId);
  if (error) throw new Error(`deleteItineraryItem: ${error.message}`);
}

export async function updateItineraryItem(
  client: SupabaseClient,
  itineraryId: string,
  itemId: string,
  userId: string,
  updates: {
    experienceId: string | null;
    title: string;
    notes: string | null;
    estimatedCost: number | null;
    images: string[];
  }
): Promise<ItineraryItem> {
  await requireOwnedItinerary(client, itineraryId, userId);
  const { data, error } = await client
    .from("itinerary_items")
    .update({
      experience_id: updates.experienceId,
      title: updates.title,
      notes: updates.notes,
      estimated_cost: updates.estimatedCost,
      images: updates.images,
    })
    .eq("id", itemId)
    .eq("itinerary_id", itineraryId)
    .select("*")
    .single();
  if (error || !data) throw new Error(`updateItineraryItem: ${error?.message ?? "not found"}`);
  return rowToItem(data);
}

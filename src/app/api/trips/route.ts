import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { createTripSchema } from "@/lib/validation/schemas";
import type { Trip } from "@/types/database";

function rowToTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    destinationCity: row.destination_city as string,
    destinationCountry: row.destination_country as string,
    startDate: row.start_date as string | null,
    endDate: row.end_date as string | null,
    status: row.status as Trip["status"],
    coverImage: row.cover_image as string | null,
    createdAt: row.created_at as string,
  };
}

export async function GET() {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ trips: (data ?? []).map(rowToTrip) });
  });
}

export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = createTripSchema.parse(await request.json());

    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        destination_city: body.destinationCity,
        destination_country: body.destinationCountry,
        start_date: body.startDate,
        end_date: body.endDate,
        status: "planning",
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ trip: rowToTrip(data) });
  });
}

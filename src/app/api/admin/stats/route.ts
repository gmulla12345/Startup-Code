import { NextResponse } from "next/server";
import { requireAdmin, withErrorHandling } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  return withErrorHandling(async () => {
    await requireAdmin();
    const admin = createAdminClient();

    const [{ count: userCount }, { count: experienceCount }, { count: activeSubs }, { data: recentEvents }, { count: eventCount }] =
      await Promise.all([
        admin.from("profiles").select("*", { count: "exact", head: true }),
        admin.from("experiences").select("*", { count: "exact", head: true }),
        admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("plan_id", "premium").in("status", ["active", "trialing"]),
        admin.from("user_events").select("event_type, created_at").order("created_at", { ascending: false }).limit(20),
        admin.from("user_events").select("*", { count: "exact", head: true }),
      ]);

    const { data: eventBreakdown } = await admin.from("user_events").select("event_type");
    const breakdown: Record<string, number> = {};
    for (const row of eventBreakdown ?? []) {
      breakdown[row.event_type] = (breakdown[row.event_type] ?? 0) + 1;
    }

    return NextResponse.json({
      userCount: userCount ?? 0,
      experienceCount: experienceCount ?? 0,
      activePremiumSubscribers: activeSubs ?? 0,
      totalEvents: eventCount ?? 0,
      eventBreakdown: breakdown,
      recentEvents: recentEvents ?? [],
    });
  });
}

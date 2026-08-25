import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Compass, CreditCard, Activity } from "lucide-react";

async function requireAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.app_metadata?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) redirect("/home");

  return user;
}

export default async function AdminOverviewPage() {
  await requireAdminPage();
  const admin = createAdminClient();

  const [{ count: userCount }, { count: experienceCount }, { count: activeSubs }, { data: eventRows }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("experiences").select("*", { count: "exact", head: true }),
    admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("plan_id", "premium").in("status", ["active", "trialing"]),
    admin.from("user_events").select("event_type"),
  ]);

  const breakdown: Record<string, number> = {};
  for (const row of eventRows ?? []) {
    breakdown[row.event_type] = (breakdown[row.event_type] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground mb-6">Overview</h1>

      <div className="grid sm:grid-cols-4 gap-4 mb-10">
        <StatCard icon={Users} label="Users" value={userCount ?? 0} />
        <StatCard icon={Compass} label="Experiences" value={experienceCount ?? 0} />
        <StatCard icon={CreditCard} label="Premium subscribers" value={activeSubs ?? 0} />
        <StatCard icon={Activity} label="Total events" value={eventRows?.length ?? 0} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Event breakdown</h2>
        {Object.keys(breakdown).length === 0 ? (
          <p className="text-sm text-foreground-muted">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(breakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">{type.replace(/_/g, " ")}</span>
                  <span className="font-medium text-foreground">{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <Icon className="h-5 w-5 text-ember mb-3" />
      <div className="font-display text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-foreground-muted">{label}</div>
    </div>
  );
}

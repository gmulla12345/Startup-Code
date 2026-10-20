import { isInPausedMonth } from "@/lib/subscription/pause";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const isAdmin = user.app_metadata?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) redirect("/home");

  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, first_name, city, onboarding_completed, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: subs } = await admin.from("subscriptions").select("user_id, plan_id, status, paused_from, paused_until");
  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-foreground mb-6">Users</h1>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-foreground-muted">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">City</th>
              <th className="p-3 font-medium">Onboarded</th>
              <th className="p-3 font-medium">Plan</th>
              <th className="p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((p) => {
              const sub = subByUser.get(p.user_id);
              const subscribed = sub?.plan_id === "premium" && ["active", "trialing"].includes(sub.status);
              // A subscriber in the one skipped month of a pause is on Free for that month.
              const paused = subscribed && isInPausedMonth({ pausedFrom: sub?.paused_from ?? null, pausedUntil: sub?.paused_until ?? null });
              const premium = subscribed && !paused;
              return (
                <tr key={p.user_id} className="border-b border-border last:border-0">
                  <td className="p-3 text-foreground">{p.first_name || "—"}</td>
                  <td className="p-3 text-foreground-muted">{p.city || "—"}</td>
                  <td className="p-3">
                    <Badge variant={p.onboarding_completed ? "forest" : "outline"}>
                      {p.onboarding_completed ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={premium ? "primary" : "default"}>{premium ? "Premium" : paused ? "Paused" : "Free"}</Badge>
                  </td>
                  <td className="p-3 text-foreground-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

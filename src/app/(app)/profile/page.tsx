import { redirect } from "next/navigation";
import Link from "next/link";
import { Pencil, Bookmark, CheckCircle2, Briefcase } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getSubscription } from "@/lib/repositories/subscriptions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubscriptionCard } from "@/components/profile/subscription-card";
import { BillingHistory } from "@/components/profile/billing-history";
import { LogoutButton } from "@/components/profile/logout-button";
import { INTERESTS } from "@/lib/config/taxonomy";
import { deriveArchetype } from "@/lib/utils/archetype";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) redirect("/onboarding");

  const [subscription, savedCountRes, completedCountRes, tripsCountRes, paymentsRes] = await Promise.all([
    getSubscription(supabase, user.id),
    supabase.from("saved_experiences").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("user_events")
      .select("experience_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("event_type", ["attended_experience", "booked_experience"]),
    supabase.from("trips").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("payments")
      .select("id, amount, currency, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const billingHistory = (paymentsRes.data ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status as "paid" | "failed" | "pending" | "refunded",
    createdAt: p.created_at,
  }));

  const archetype = deriveArchetype(profile.personality);
  const interestLabels = profile.interests.map((i) => INTERESTS.find((opt) => opt.value === i)?.label ?? i);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Avatar src={profile.avatarUrl} name={profile.firstName || user.email || "You"} size={72} />
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">{profile.firstName || "Your profile"}</h1>
            <p className="text-sm text-foreground-muted">{user.email}</p>
            {profile.city && <p className="text-sm text-foreground-muted">{profile.city}{profile.region ? `, ${profile.region}` : ""}</p>}
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/edit">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={Bookmark} value={savedCountRes.count ?? 0} label="Saved" />
        <StatCard icon={CheckCircle2} value={completedCountRes.count ?? 0} label="Completed" />
        <StatCard icon={Briefcase} value={tripsCountRes.count ?? 0} label="Trips" />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-border bg-[linear-gradient(160deg,var(--ember-soft),var(--surface))] p-6 mb-8">
        <p className="text-xs uppercase tracking-wide text-foreground-subtle mb-1">Your Experience Profile</p>
        <h2 className="font-display text-2xl font-semibold text-foreground mb-2">You&apos;re a {archetype.label}.</h2>
        <p className="text-sm text-foreground-muted">{archetype.description}</p>
      </div>

      <div className="mb-8">
        <SubscriptionCard subscription={subscription} />
      </div>

      {billingHistory.length > 0 && (
        <div className="mb-8">
          <BillingHistory items={billingHistory} />
        </div>
      )}

      {interestLabels.length > 0 && (
        <div className="mb-8">
          <h3 className="font-display text-lg font-semibold text-foreground mb-3">Your interests</h3>
          <div className="flex flex-wrap gap-2">
            {interestLabels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <LogoutButton />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-center">
      <Icon className="h-5 w-5 text-ember mx-auto mb-2" />
      <div className="font-display text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-foreground-muted">{label}</div>
    </div>
  );
}

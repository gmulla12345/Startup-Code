import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { brand } from "@/lib/config/brand";
import { PremiumPlanCard } from "@/components/profile/premium-plan-card";

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscription = await getSubscription(supabase, user.id);
  if (isPremium(subscription)) redirect("/profile");

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-foreground-muted mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <div className="rounded-[var(--radius-xl)] border-2 border-ember bg-surface p-8">
        <h1 className="font-display text-3xl font-semibold text-foreground mb-6">{brand.name} Premium</h1>
        <PremiumPlanCard />
      </div>
    </div>
  );
}

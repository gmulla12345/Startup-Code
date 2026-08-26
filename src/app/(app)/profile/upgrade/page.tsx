import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { pricing } from "@/lib/config/pricing";
import { brand } from "@/lib/config/brand";
import { UpgradeButton } from "@/components/profile/upgrade-button";

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
        <h1 className="font-display text-3xl font-semibold text-foreground mb-1">{brand.name} Premium</h1>
        <div className="mb-6">
          <span className="font-display text-4xl font-semibold text-foreground">${pricing.premium.priceMonthly}</span>
          <span className="text-foreground-muted"> /month</span>
        </div>

        <ul className="space-y-3 mb-8">
          {pricing.premium.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground-muted">
              <Check className="h-4 w-4 text-ember mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <UpgradeButton />
        <p className="text-xs text-foreground-subtle text-center mt-3">Cancel anytime from your profile.</p>
      </div>
    </div>
  );
}

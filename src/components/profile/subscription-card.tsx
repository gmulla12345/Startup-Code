"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricing } from "@/lib/config/pricing";
import { brand } from "@/lib/config/brand";
import { getBillingPreference } from "@/lib/utils/billing-preference";
import type { Subscription } from "@/types/database";

export function SubscriptionCard({ subscription }: { subscription: Subscription | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isPremium = subscription?.planId === "premium" && ["active", "trialing"].includes(subscription.status);

  async function handleUpgrade() {
    setLoading(true);
    try {
      // Respects whatever billing interval the user picked on the homepage
      // pricing toggle or /profile/upgrade — this button is a second,
      // shorter path to checkout that bypasses that page, so it needs to
      // honor the same saved preference instead of silently defaulting to
      // monthly regardless of what they chose.
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingInterval: getBillingPreference() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout unavailable.");
      window.location.href = json.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  async function handleManage() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Billing portal unavailable.");
      window.location.href = json.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    } finally {
      router.refresh();
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className={isPremium ? "h-5 w-5 text-ember" : "h-5 w-5 text-foreground-subtle"} />
        <h3 className="font-display text-lg font-semibold text-foreground">
          {isPremium ? `${brand.name} Premium` : "Free Plan"}
        </h3>
      </div>
      <p className="text-sm text-foreground-muted mb-4">
        {isPremium
          ? subscription?.cancelAtPeriodEnd
            ? `Cancels at the end of your billing period.`
            : `You have full access to unlimited discovery, AI planning, and exclusive experiences.`
          : `Upgrade for unlimited Surprise Me, AI trip planning, and exclusive experiences — $${pricing.premium.priceMonthly}/mo.`}
      </p>
      {isPremium ? (
        <Button variant="outline" onClick={handleManage} loading={loading}>
          {loading ? "Loading..." : "Manage subscription"}
        </Button>
      ) : (
        <Button onClick={handleUpgrade} loading={loading}>
          {loading ? "Loading..." : "Upgrade to Premium"}
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStudentPlanConfigured, pricing } from "@/lib/config/pricing";
import { brand } from "@/lib/config/brand";
import { getBillingPreference } from "@/lib/utils/billing-preference";
import { getEndorselyReferral } from "@/lib/analytics/endorsely";
import { describeSubscription } from "@/lib/subscription/state";
import { formatDay } from "@/lib/subscription/format";
import type { Subscription } from "@/types/database";

export function SubscriptionCard({ subscription }: { subscription: Subscription | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const view = describeSubscription(subscription);
  // Premium in effect right now. A month paused rests on Free, but the subscription is theirs: no Upgrade button then.
  const isPremium = view.kind === "premium" || view.kind === "ending" || view.kind === "pause_scheduled";
  const hasSubscription = view.kind !== "free";

  async function handleUpgrade() {
    // Once the Student plan is on sale there is a choice to make (Premium or Student, monthly or annual),
    // so this goes to the page that offers it instead of straight to a checkout for one plan.
    if (isStudentPlanConfigured()) {
      router.push("/profile/upgrade");
      return;
    }
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
        body: JSON.stringify({
          billingInterval: getBillingPreference(),
          endorselyReferral: getEndorselyReferral(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout unavailable.");
      window.location.href = json.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  /** Take back a cancellation or a pause that has not taken effect yet. */
  async function handleUndo(action: "keep" | "unpause") {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "That did not go through.");
      // COPY: said once a cancellation or a pause is taken back
      toast.success(action === "keep" ? "Premium continues." : "The pause is undone.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManage() {
    // Premium sold via a Digistore24 affiliate has no Stripe customer
    // behind it — DS24's own buyer-support page (cancel, refund, update
    // payment method) is the only place that can actually manage it.
    if (subscription?.digistore24ManageUrl) {
      window.location.href = subscription.digistore24ManageUrl;
      return;
    }

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
        <Sparkles className={isPremium ? "h-5 w-5 text-primary" : "h-5 w-5 text-foreground-subtle"} />
        <h3 className="font-display text-lg font-semibold text-foreground">
          {hasSubscription ? `${brand.name} Premium${view.kind === "paused" ? " · Paused" : "student" in view && view.student ? " · Student" : ""}` : "Free Plan"}
        </h3>
      </div>
      <p className="text-sm text-foreground-muted mb-4">
        {/* COPY: the profile card, in each state a subscription can be in */}
        {view.kind === "ending"
          ? `Premium ends on ${formatDay(view.endsOn)}. Everything you saved stays.`
          : view.kind === "pause_scheduled"
            ? `Premium pauses on ${formatDay(view.from)}. The month after costs nothing, and Premium returns on ${formatDay(view.until)}.`
            : view.kind === "paused"
              ? `Premium is paused. It returns on ${formatDay(view.until)}, and nothing is charged until then.`
              : view.kind === "premium"
                ? `You have full access to unlimited discovery, more specific categories in Discover, and AI planning.`
                : `Upgrade for unlimited Surprise Me, more specific categories in Discover, and AI trip planning — $${pricing.premium.priceMonthly}/mo.`}
      </p>
      {hasSubscription ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {view.kind === "ending" && !subscription?.digistore24ManageUrl && (
            <Button onClick={() => handleUndo("keep")} loading={loading}>
              Keep Premium
            </Button>
          )}
          {view.kind === "pause_scheduled" && (
            <Button onClick={() => handleUndo("unpause")} loading={loading}>
              Undo pause
            </Button>
          )}
          <Button variant="outline" onClick={handleManage} loading={loading}>
            {loading ? "Loading..." : "Manage subscription"}
          </Button>
          {/* COPY: the quiet way to begin cancelling (Premium bought through Digistore24 is cancelled with Digistore24) */}
          {view.kind === "premium" && view.managedBy === "stripe" && (
            <Link href="/profile/cancel" className="text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
              Cancel Premium
            </Link>
          )}
        </div>
      ) : (
        <Button onClick={handleUpgrade} loading={loading}>
          {loading ? "Loading..." : "Upgrade to Premium"}
        </Button>
      )}
    </div>
  );
}

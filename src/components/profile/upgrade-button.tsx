"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/lib/config/pricing";

export function UpgradeButton({ billingInterval }: { billingInterval: BillingInterval }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingInterval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout unavailable.");
      window.location.href = json.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <Button size="lg" className="w-full" onClick={handleClick} loading={loading}>
      {loading ? "Redirecting..." : "Upgrade to Premium"}
    </Button>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pricing, type BillingInterval } from "@/lib/config/pricing";
import { getEndorselyReferral } from "@/lib/analytics/endorsely";

/**
 * The upgrade button, with an optional promo code. The code is only sent to the
 * server, which decides whether it may be used (verified student, first-time,
 * one per person, not expired or used up) and applies it at checkout. Nothing
 * here grants anything. The words under the field say what a student code does,
 * including what happens when the free month ends, before anyone continues.
 *
 * `initialCode` is a code the server already checked for this account (the one
 * they entered when they signed up); `requireCard` mirrors the server setting.
 *
 * Native equivalent: the app cannot use this path (digital subscriptions bought
 * in an iOS or Android app go through the store), so it needs the stores' own
 * offer codes. See zolo-app/CLAUDE.md.
 */
export function UpgradeButton({
  billingInterval,
  initialCode = "",
  requireCard = true,
}: {
  billingInterval: BillingInterval;
  initialCode?: string;
  requireCard?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [showCode, setShowCode] = useState(Boolean(initialCode));
  const trimmed = code.trim();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingInterval,
          promoCode: trimmed || undefined,
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

  const price = `$${pricing.premium.priceMonthly}`;
  const note =
    billingInterval === "annual"
      ? "Student codes apply to monthly Premium."
      : requireCard
        ? `A student code gives one free month of Premium. A card is needed to start it, and it is charged ${price} a month when the month ends unless you cancel first.`
        : "A student code gives one free month of Premium, with no card. When the month ends, add a card from your profile to keep Premium.";

  return (
    <div>
      {showCode ? (
        <div className="mb-4">
          <label htmlFor="promo-code" className="mb-1.5 block text-sm font-medium text-foreground">
            Promo code
          </label>
          <Input
            id="promo-code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Optional"
            maxLength={64}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          {trimmed && <p className="mt-2 text-xs leading-relaxed text-foreground-subtle">{note}</p>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCode(true)}
          className="mb-4 text-sm text-foreground-muted underline underline-offset-4 hover:text-foreground"
        >
          Have a promo code?
        </button>
      )}
      <Button size="lg" className="w-full" onClick={handleClick} loading={loading}>
        {loading ? "Redirecting..." : "Upgrade to Premium"}
      </Button>
    </div>
  );
}

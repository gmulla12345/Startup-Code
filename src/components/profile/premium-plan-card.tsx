"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { pricing, studentPricing, type BillingInterval, type CheckoutPlan } from "@/lib/config/pricing";
import { getBillingPreference, setBillingPreference } from "@/lib/utils/billing-preference";
import { UpgradeButton } from "./upgrade-button";

/**
 * What a signed-in person chooses before checkout: monthly or annual Premium, and, when
 * the Student plan is on sale (`student` is passed only then), Premium or Student.
 * The Student plan is monthly only, and shows the regular price beside it so it reads
 * against it. Whether an account may have it is decided on the server; `eligible` only
 * shapes what is said here (an account without a verified school email is told what it
 * needs, and the server refuses it either way).
 */
export function PremiumPlanCard({
  savedCode,
  requireCard,
  student,
}: { savedCode?: string; requireCard?: boolean; student?: { eligible: boolean } } = {}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [plan, setPlan] = useState<CheckoutPlan>("premium");

  // Reads the choice made on the homepage pricing toggle, if any — avoids a
  // hydration mismatch from reading localStorage during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage after mount to avoid an SSR hydration mismatch
    setInterval(getBillingPreference());
  }, []);

  function choose(next: BillingInterval) {
    setInterval(next);
    setBillingPreference(next);
  }

  const onStudent = Boolean(student?.eligible) && plan === "student";
  // Student chosen by an account with no verified school email: say what it needs, and show nothing to buy.
  const blocked = plan === "student" && Boolean(student) && !student?.eligible;
  const isAnnual = !onStudent && interval === "annual";
  const price = onStudent ? studentPricing.priceMonthly : isAnnual ? pricing.premium.priceAnnual : pricing.premium.priceMonthly;
  const annualSavings = pricing.premium.priceMonthly * 12 - pricing.premium.priceAnnual;

  return (
    <div>
      {student && (
        <div className="mb-5">
          <div className="inline-flex rounded-full border border-border p-1" role="group" aria-label="Plan">
            {/* COPY: the two plans a verified student can choose between */}
            <button
              onClick={() => setPlan("premium")}
              aria-pressed={plan === "premium"}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", plan === "premium" ? "bg-primary text-white" : "text-foreground-muted")}
            >
              Premium
            </button>
            <button
              onClick={() => setPlan("student")}
              aria-pressed={plan === "student"}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", plan === "student" ? "bg-primary text-white" : "text-foreground-muted")}
            >
              Student
            </button>
          </div>
          {blocked && (
            <p role="status" className="mt-3 text-sm text-foreground-muted">
              {/* COPY: shown when the person's account has no verified school email */}
              The student price is for accounts with a verified school email. Yours is not one yet.{" "}
              <Link href="/students" className="text-primary hover:underline">
                Make an account with your school email
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {!onStudent && !blocked && (
        <div className="inline-flex rounded-full border border-border p-1 mb-6">
          <button
            onClick={() => choose("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              !isAnnual ? "bg-primary text-white" : "text-foreground-muted"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => choose("annual")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1.5",
              isAnnual ? "bg-primary text-white" : "text-foreground-muted"
            )}
          >
            Annual
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                isAnnual ? "bg-white/20" : "bg-[var(--gold-soft)] text-[color:var(--gold)]"
              )}
            >
              Save 20%
            </span>
          </button>
        </div>
      )}

      {!blocked && (
        <>
          <div className="mb-1 flex items-baseline gap-2 flex-wrap">
            {onStudent && <span className="text-lg text-foreground-subtle line-through decoration-2">${pricing.premium.priceMonthly}</span>}
            <span className="font-display text-4xl font-semibold text-foreground">${price}</span>
            <span className="text-foreground-muted"> /{isAnnual ? "year" : "month"}</span>
          </div>
          <p className="text-sm text-forest font-medium mb-6 min-h-5">
            {onStudent
              ? /* COPY: under the Student price */ `Regular Premium is $${pricing.premium.priceMonthly} a month. Your rate stays the same while you stay subscribed.`
              : isAnnual
                ? `That's $${(price / 12).toFixed(2)}/mo — you save $${annualSavings.toFixed(2)}/year.`
                : ""}
          </p>

          <ul className="space-y-3 mb-8">
            {pricing.premium.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-foreground-muted">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Keyed by plan so a code typed for one plan does not follow the person to the other without them seeing the words that go with it. */}
          <UpgradeButton
            key={onStudent ? "student" : "premium"}
            billingInterval={onStudent ? "monthly" : interval}
            plan={onStudent ? "student" : "premium"}
            initialCode={savedCode}
            requireCard={requireCard}
          />
          <p className="text-xs text-foreground-subtle text-center mt-3">Cancel anytime from your profile.</p>
        </>
      )}
    </div>
  );
}

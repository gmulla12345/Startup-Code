import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Welcome to Premium",
  ...noindexMetadata,
};

/**
 * Digistore24's required "thank you page" for the Zolo Premium product —
 * DS24 mandates the debit-disclosure line below verbatim on whatever page a
 * buyer lands on after paying. No order data is appended to this URL (left
 * at DS24's default), since the actual account grant happens independently
 * via the IPN webhook (src/app/api/digistore24/webhook), not from anything
 * this page reads — a buyer can land here before that webhook has even run,
 * so this page can only ever say "check your email," never confirm access
 * is live yet.
 */
export default function PremiumWelcomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--forest-soft)]">
        <CheckCircle2 className="h-7 w-7 text-forest" />
      </div>

      <p className="text-sm font-medium text-ember mb-3">You&apos;re in</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-4">
        Welcome to {brand.name} Premium
      </h1>
      <p className="text-lg text-foreground-muted mb-8">
        Your purchase went through. Check the email address you used at checkout — we&apos;ve sent a link to set
        your password and log in. If you already have a {brand.name} account, your Premium access is tied to
        that email and unlocks as soon as it&apos;s processed.
      </p>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 mb-8 text-left">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">What you just unlocked</h2>
        <ul className="space-y-2">
          {pricing.premium.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-foreground-muted">
              <CheckCircle2 className="h-4 w-4 text-forest shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Button asChild size="lg">
        <Link href="/login">Log in to {brand.name}</Link>
      </Button>

      <p className="mt-8 text-xs text-foreground-subtle">
        The debit will be performed by Digistore24.com
      </p>
      <p className="mt-3 text-sm text-foreground-muted">
        Didn&apos;t get the email, or something look wrong?{" "}
        <a href={`mailto:${brand.supportEmail}`} className="text-ember hover:underline">
          Email us
        </a>
        .
      </p>
    </div>
  );
}

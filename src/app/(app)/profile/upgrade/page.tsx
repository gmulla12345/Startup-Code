import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { brand } from "@/lib/config/brand";
import { PremiumPlanCard } from "@/components/profile/premium-plan-card";
import { noindexMetadata } from "@/lib/seo";
import { isStripeConfigured } from "@/lib/stripe/client";
import { previewPromoCode } from "@/lib/stripe/promo";
import { studentPromoRequiresCard } from "@/lib/config/promo";
import { isStudentPlanConfigured } from "@/lib/config/pricing";

export const metadata = noindexMetadata;

export default async function UpgradePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subscription = await getSubscription(supabase, user.id);
  if (isPremium(subscription)) redirect("/profile");

  // The code they entered when they signed up, if it is one this account can use
  // (checked on the server), is filled in for them. Anything else is left blank.
  let savedCode: string | undefined;
  // Whether this account has a verified school email, for the Student plan (offered only once it is on sale).
  // This only shapes what the page says; the server decides who may have the price, at checkout.
  const studentOffered = isStudentPlanConfigured();
  let eduVerified = false;
  if (studentOffered) {
    const { data } = await supabase.from("profiles").select("edu_verified_at").eq("user_id", user.id).maybeSingle();
    eduVerified = Boolean(data?.edu_verified_at);
  }
  if (isStripeConfigured()) {
    const { data: profile } = await supabase.from("profiles").select("signup_code").eq("user_id", user.id).maybeSingle();
    const signupCode = profile?.signup_code as string | null | undefined;
    if (signupCode) {
      const preview = await previewPromoCode(user.id, signupCode);
      if (preview.ok) savedCode = preview.code;
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-foreground-muted mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>

      <div className="rounded-[var(--radius-xl)] border-2 border-primary bg-surface p-8">
        <h1 className="font-display text-3xl font-semibold text-foreground mb-6">{brand.name} Premium</h1>
        <PremiumPlanCard
          savedCode={savedCode}
          requireCard={studentPromoRequiresCard()}
          student={studentOffered ? { eligible: eduVerified } : undefined}
        />
      </div>
    </div>
  );
}

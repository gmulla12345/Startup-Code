import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/repositories/subscriptions";
import { CancelScreen } from "@/components/profile/cancel-screen";
import { noindexMetadata } from "@/lib/seo";
import { isStudentPlanConfigured, studentPricing } from "@/lib/config/pricing";
import { cancelOptions, isManageableHere } from "@/lib/stripe/cancel-flow";
import { getFoundingStatus, publicFoundingStatus } from "@/lib/founding/offer";
import { describeSubscription } from "@/lib/subscription/state";

export const metadata = noindexMetadata;

/**
 * The screen between Premium and cancelling. Only for a Premium subscription bought through Stripe that is not
 * already ending or paused; anyone else is sent back to their profile, where those states have their own words.
 * (Premium bought through Digistore24 is cancelled with Digistore24, from the profile.)
 */
export default async function CancelPremiumPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const subscription = await getSubscription(supabase, user.id);
  if (!isManageableHere(subscription) || describeSubscription(subscription).kind !== "premium") redirect("/profile");

  // What can be offered. The student price needs a verified school email and a spot; each is checked again on the server when chosen.
  const studentOnSale = isStudentPlanConfigured();
  let eduVerified = false;
  let studentOpen = false;
  if (studentOnSale) {
    const { data } = await supabase.from("profiles").select("edu_verified_at").eq("user_id", user.id).maybeSingle();
    eduVerified = Boolean(data?.edu_verified_at);
    try {
      studentOpen = publicFoundingStatus(await getFoundingStatus()).open;
    } catch (error) {
      console.error("[founding] status unavailable on the cancel screen:", error); // not offered rather than offered and refused
    }
  }
  const options = cancelOptions({ subscription, eduVerified, studentOnSale, studentOpen });

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-foreground-muted mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>
      <CancelScreen endsOn={options.endsOn} student={options.student} pause={options.pause} studentPrice={studentPricing.priceMonthly} />
    </div>
  );
}

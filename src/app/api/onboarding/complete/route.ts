import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api/auth";
import { updateProfile } from "@/lib/repositories/profile";
import { trackEvent } from "@/lib/repositories/events";

export async function POST() {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();

    const profile = await updateProfile(supabase, user.id, {
      onboardingCompleted: true,
      onboardingStep: 6,
    });

    await trackEvent(supabase, user.id, "changed_preference", null, { source: "onboarding_completed" });

    return NextResponse.json({ profile });
  });
}

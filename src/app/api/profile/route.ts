import { NextResponse } from "next/server";
import { requireUser, withErrorHandling, ApiError } from "@/lib/api/auth";
import { getProfileByUserId, updateProfile } from "@/lib/repositories/profile";
import { getSubscription } from "@/lib/repositories/subscriptions";

export async function GET() {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const profile = await getProfileByUserId(supabase, user.id);
    if (!profile) throw new ApiError(404, "Profile not found.");

    const subscription = await getSubscription(supabase, user.id);
    return NextResponse.json({ profile, subscription, email: user.email });
  });
}

export async function PATCH(request: Request) {
  return withErrorHandling(async () => {
    const { user, supabase } = await requireUser();
    const body = await request.json();
    const profile = await updateProfile(supabase, user.id, body);
    return NextResponse.json({ profile });
  });
}

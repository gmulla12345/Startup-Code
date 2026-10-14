import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attributionFromCookieHeader } from "@/lib/attribution";
import { applySignupAttribution } from "@/lib/analytics/server";

/**
 * Handles the redirect from Supabase Auth after email confirmation, OAuth
 * (Google), or a magic link — exchanges the code for a session cookie, then
 * sends the user onward.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") || "/home";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A Google sign-in cannot carry src/code in user metadata, so attach the
      // campaign cookie to a brand-new account here. The database only applies it
      // to an account created in the last 30 minutes with no attribution yet.
      if (data.user) {
        await applySignupAttribution(data.user.id, attributionFromCookieHeader(request.headers.get("cookie")));
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

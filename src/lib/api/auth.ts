import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Resolves the authenticated user for a Route Handler. Supports two auth
 * paths, checked in this order:
 *
 *  1. `Authorization: Bearer <access_token>` header — for a client that
 *     can't send cookies (the mobile app; see zolo-app/kickoff-prompt.md).
 *     `token` is whatever `supabase-js` on that client returned from sign-in
 *     — validated here with a real round trip to Supabase Auth (so an
 *     expired/revoked token is correctly rejected, not just decoded
 *     client-side), then attached to a fresh client's default headers so
 *     every later `.from(...)`/`.storage` call on the *returned* client is
 *     also correctly scoped by RLS as that user (Postgrest reads the same
 *     JWT for `auth.uid()`) — not just the identity check itself.
 *  2. Cookie-based session (the website's own browser client) — unchanged
 *     from before this existed, and still the only path an ordinary browser
 *     request ever hits, since it never sends this header.
 *
 * Throws ApiError(401) if neither resolves a user — callers should catch via
 * withErrorHandling().
 */
export async function requireUser(): Promise<{ user: User; supabase: SupabaseClient }> {
  const bearerToken = (await headers()).get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken) {
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    if (user) return { user, supabase };
    // Falls through to the cookie check below rather than failing closed —
    // an invalid/expired bearer token shouldn't mask a still-valid cookie
    // session on the rare request that somehow carries both.
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ApiError(401, "Authentication required.");
  return { user, supabase };
}

export async function requireAdmin(): Promise<{ user: User; supabase: SupabaseClient }> {
  const { user, supabase } = await requireUser();
  const isAdmin = user.app_metadata?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) throw new ApiError(403, "Admin access required.");
  return { user, supabase };
}

export function withErrorHandling(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  return handler().catch((err) => {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[api] unhandled error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  });
}

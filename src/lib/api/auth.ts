import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Resolves the authenticated user for a Route Handler. Throws ApiError(401)
 * if there isn't one — callers should catch via withErrorHandling().
 */
export async function requireUser(): Promise<{ user: User; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new ApiError(401, "Authentication required.");
  return { user, supabase };
}

export async function requireAdmin(): Promise<{ user: User; supabase: Awaited<ReturnType<typeof createClient>> }> {
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

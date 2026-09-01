import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server
 * Actions). Reads/writes auth cookies via Next's cookies() API. Still uses
 * the anon key — RLS enforces access control, not this client's privileges.
 *
 * Wrapped in React's cache() so the (app) layout and the page it renders
 * share one client instance per request instead of each constructing their
 * own — this is what makes getCurrentUser()/getCachedProfile() below
 * actually dedupe, since without a stable client reference every call would
 * still hit Supabase again. Safe to cache per-request: cookies don't change
 * mid-request.
 */
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no request context to
            // mutate — safe to ignore because middleware refreshes sessions.
          }
        },
      },
    }
  );
});

/**
 * Cached per request — the (app) layout and every page under it used to
 * each independently call supabase.auth.getUser(), doubling the auth round
 * trip on every single navigation. Call this instead of
 * `(await createClient()).auth.getUser()` directly wherever only the user
 * (not other calls on the client) is needed.
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

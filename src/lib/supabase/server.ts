import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server
 * Actions). Reads/writes auth cookies via Next's cookies() API. Still uses
 * the anon key — RLS enforces access control, not this client's privileges.
 */
export async function createClient() {
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
}

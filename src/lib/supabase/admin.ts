import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER-ONLY — this key bypasses Row Level
 * Security entirely. Never import this file from a Client Component or
 * anything bundled to the browser. Use only in:
 *   - webhook handlers (Stripe) that must write regardless of RLS
 *   - admin API routes, after verifying the caller is an admin
 *   - seed/migration scripts
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL missing — admin client unavailable."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

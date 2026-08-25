import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Anon-key Supabase client with no cookie/session handling. Use this for
 * reads that don't depend on the current user (the public experience
 * catalog, destinations, categories) — unlike lib/supabase/server.ts, this
 * never calls next/headers' cookies(), so pages using only this client can
 * still be statically prerendered instead of forced into dynamic rendering.
 */
export function createPublicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

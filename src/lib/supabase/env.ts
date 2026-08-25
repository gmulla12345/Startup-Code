/**
 * @supabase/ssr throws synchronously if the URL/key are missing entirely,
 * which would crash every page in local dev before Supabase is configured.
 * Falling back to harmless placeholders keeps client construction safe;
 * any actual auth/database call then simply fails at the network layer and
 * is handled like any other unreachable backend (no session, empty data).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "not-configured-placeholder-anon-key";

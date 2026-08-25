import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_APP_PATHS = ["/onboarding"];
const PROTECTED_PREFIXES = ["/home", "/discover", "/map", "/trips", "/saved", "/profile", "/admin"];

/** Matches the exact segment, not just a string prefix — "/map" must not match "/map-debug". */
function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Refreshes the Supabase session on every request and redirects
 * unauthenticated users away from protected app routes. Mirrors the
 * pattern Supabase recommends for Next.js middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured yet (local dev without credentials) — skip
    // auth gating rather than crashing every request.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => matchesPathPrefix(pathname, p));
  const isAppPublic = PUBLIC_APP_PATHS.some((p) => matchesPathPrefix(pathname, p));

  if (!user && isProtected) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && isAppPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (matchesPathPrefix(pathname, "/admin") && user) {
    const isAdmin = user.app_metadata?.role === "admin" || user.email === process.env.ADMIN_EMAIL;
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return response;
}

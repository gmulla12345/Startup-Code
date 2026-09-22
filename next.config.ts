import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Derived from env at build time rather than hardcoded, so this can't drift
// out of sync with the real Supabase project or Sentry DSN. Both hosts are
// already public (NEXT_PUBLIC_SUPABASE_URL ships to the browser regardless;
// a Sentry DSN identifies an endpoint, not a secret) — safe to read here.
function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
const supabaseHost = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const sentryHost = hostOf(process.env.NEXT_PUBLIC_SENTRY_DSN?.replace(/^https?:\/\/[^@]+@/, "https://"));
// Same fallback discovery-map.tsx uses -- MapLibre fetches the style JSON,
// vector tiles, sprites, and glyphs all via fetch/XHR (connect-src, not
// img-src, since none of it loads through an <img> tag), all from this one
// host. Missing this when the CSP first shipped silently blocked every
// tile request -- pins/markers still rendered (plain DOM, positioned by
// JS) while the actual basemap stayed a blank black rectangle underneath.
const mapTilesHost = hostOf(process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty");

// React's dev build uses eval() for debugging (stack trace reconstruction
// across Fast Refresh boundaries) -- "React will never use eval() in
// production mode" per its own warning, so this is scoped to development
// only rather than weakening the real production policy.
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is needed for Next's own hydration/RSC payload scripts
  // and the small inline GA4 shim (google-analytics.tsx) -- a nonce-based
  // CSP would remove this but needs real end-to-end testing of Next's script
  // injection paths first; this is a deliberate, documented trade-off, not
  // an oversight.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://assets.endorsely.com`,
  "style-src 'self' 'unsafe-inline'",
  // MapLibre GL parses vector tiles off the main thread via a Web Worker it
  // constructs from a blob: URL. worker-src has no fallback to connect-src
  // -- CSP falls it back to script-src, which doesn't list blob: -- so
  // without this explicit directive the worker's own construction was
  // silently blocked (CSP worker failures report almost no detail: a bare
  // ErrorEvent with no message). That stalled MapLibre before it ever
  // issued a single vector tile request: the style JSON/sprite/glyphs load
  // fine on the main thread, so the basemap's flat land-color background
  // painted correctly, but roads/labels/POIs never rendered because the
  // worker that parses that data never started.
  "worker-src 'self' blob:",
  // Images come from many real hosts (Google Places photos, Unsplash,
  // Supabase storage) with unbounded/rotating URLs -- scoping this to https:
  // broadly is standard practice since img-src has far less XSS blast radius
  // than script-src.
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabaseHost ? `https://${supabaseHost}` : "",
    "https://www.google-analytics.com",
    sentryHost ? `https://${sentryHost}` : "",
    "https://assets.endorsely.com",
    mapTilesHost ? `https://${mapTilesHost}` : "",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
  experimental: {
    // Default is 0s for dynamic segments, meaning every client-side
    // navigation to an already-visited page re-runs its full server data
    // fetch from scratch. Reusing a segment's data for 30s makes bouncing
    // between tabs (Home/Discover/Map/Trips/Saved/Profile) feel instant on
    // revisits instead of re-paying the auth+DB+Google Places round trip
    // every single time.
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.googleapis.com", pathname: "/maps/api/place/photo**" },
    ],
    // Every real experience photo is a live Google Places photo (unbounded
    // cardinality — a different unique source URL per place, at real-app
    // traffic volume) plus a small set of Unsplash URLs. Both already
    // request an appropriately sized image from their own CDN (maxwidth on
    // the Google Photos redirect, w=/h=/q= on Unsplash), so Next's own
    // resizing pass on top adds little — but every distinct source URL it
    // resizes counts against Vercel's per-billing-period Image Optimization
    // quota, and Google Places' unbounded URL space blew through it
    // (confirmed via the /_next/image response body:
    // "OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED", a 402 from Vercel itself,
    // not from Google or the app). unoptimized skips that proxy entirely —
    // images still lazy-load via next/image, they're just served directly
    // from their origin CDN instead of re-optimized through Vercel's paid
    // pipeline.
    unoptimized: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  disableLogger: true,
  widenClientFileUpload: true,
  automaticVercelMonitors: false,
  // No performance tracing is configured (see instrumentation-client.ts) —
  // this actually removes the tracing code from the client bundle instead
  // of just leaving it unused, which was costing ~2.35s of Total Blocking
  // Time on every page load per a 2026-09-18 Lighthouse run.
  bundleSizeOptimizations: {
    excludeTracing: true,
  },
});

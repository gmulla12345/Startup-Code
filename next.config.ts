import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
});

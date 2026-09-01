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

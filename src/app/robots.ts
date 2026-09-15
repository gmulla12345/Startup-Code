import type { MetadataRoute } from "next";
import { brand } from "@/lib/config/brand";

// /onboarding, /profile, /saved, /trips, /home, /discover, /map, /login,
// /signup, and /reset-password are deliberately NOT disallowed here even
// though they're all private/thin pages — each has its own `noindex` meta
// tag instead (see noindexMetadata in src/lib/seo.ts). A robots.txt
// Disallow blocks crawling entirely, which means Google can never fetch the
// page to see that noindex tag — if a URL is ever indexed some other way
// (e.g. discovered via a link, with no snippet), Disallow would actually
// prevent it from ever being removed. Only /api/ and /admin/ stay blocked
// here: neither has (or needs) per-page noindex tags, and there's no
// concern about them being indexed some other way worth leaving crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${brand.domain}/sitemap.xml`,
  };
}

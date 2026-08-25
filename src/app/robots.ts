import type { MetadataRoute } from "next";
import { brand } from "@/lib/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/onboarding", "/profile", "/saved", "/trips"],
      },
    ],
    sitemap: `${brand.domain}/sitemap.xml`,
  };
}

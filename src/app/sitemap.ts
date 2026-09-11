import type { MetadataRoute } from "next";
import { brand } from "@/lib/config/brand";
import { getTravelProvider } from "@/services/providers";
import { VS_PAGES } from "@/lib/content/vs-pages";
import { BLOG_POSTS } from "@/lib/content/blog-posts";

// /login and /signup are noindexed (see src/app/(auth)/layout.tsx) and
// deliberately excluded here — only include pages we actually want Google
// to index and rank. Experience detail pages are also excluded: they carry
// a per-page noindex (see experience/[id]/page.tsx generateMetadata) since
// they're thin, largely non-unique Google-Places-sourced content.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const destinations = await getTravelProvider().listDestinations();

  return [
    { url: brand.domain, changeFrequency: "weekly", priority: 1 },
    { url: `${brand.domain}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${brand.domain}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${brand.domain}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${brand.domain}/careers`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${brand.domain}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${brand.domain}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${brand.domain}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${brand.domain}/blog`, changeFrequency: "weekly", priority: 0.6 },
    ...BLOG_POSTS.map((p) => ({
      url: `${brand.domain}/blog/${p.slug}`,
      lastModified: p.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...VS_PAGES.map((p) => ({
      url: `${brand.domain}/vs/${p.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...destinations.map((d) => ({
      url: `${brand.domain}/travel/${d.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

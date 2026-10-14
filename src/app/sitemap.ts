import type { MetadataRoute } from "next";
import { brand } from "@/lib/config/brand";
import { getTravelProvider } from "@/services/providers";
import { VS_PAGES } from "@/lib/content/vs-pages";
import { BLOG_POSTS } from "@/lib/content/blog-posts";
import { AUTHORS, authorUrl } from "@/lib/content/authors";
import { OTHER_PAGE_LAST_MODIFIED, PAGE_SEO } from "@/lib/content/page-seo";

// /login and /signup are noindexed (see src/app/(auth)/layout.tsx) and
// deliberately excluded here — only include pages we actually want Google
// to index and rank. Experience detail pages are also excluded: they carry
// a per-page noindex (see experience/[id]/page.tsx generateMetadata) since
// they're thin, largely non-unique Google-Places-sourced content.
//
// Every entry carries a real `lastModified` (heycatch SEO audit
// t_sitemap_fresh): previously only blog posts had one, so the sitemap's
// "newest lastmod" was just the most recent post's publish date and every
// other page looked undated. Dates come from page-seo.ts (static pages,
// /vs, /travel) and from each post's own `updatedAt`/`publishedAt` -- the
// date the content last really changed, never the build date. Bump them
// there when you edit a page.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const destinations = await getTravelProvider().listDestinations();

  const authorEntries = AUTHORS.map((author) => {
    const dates = BLOG_POSTS.filter((p) => p.authorSlug === author.slug).map((p) => p.updatedAt ?? p.publishedAt);
    const latest = dates.sort().at(-1);
    return {
      url: authorUrl(author),
      ...(latest ? { lastModified: latest } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    };
  });

  return [
    { url: brand.domain, lastModified: OTHER_PAGE_LAST_MODIFIED.home, changeFrequency: "weekly", priority: 1 },
    { url: `${brand.domain}${PAGE_SEO.pricing.path}`, lastModified: PAGE_SEO.pricing.lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${brand.domain}${PAGE_SEO.about.path}`, lastModified: PAGE_SEO.about.lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${brand.domain}${PAGE_SEO.contact.path}`, lastModified: PAGE_SEO.contact.lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${brand.domain}${PAGE_SEO.careers.path}`, lastModified: PAGE_SEO.careers.lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${brand.domain}${PAGE_SEO.students.path}`, lastModified: PAGE_SEO.students.lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${brand.domain}${PAGE_SEO.faq.path}`, lastModified: PAGE_SEO.faq.lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${brand.domain}/privacy`, lastModified: OTHER_PAGE_LAST_MODIFIED.privacy, changeFrequency: "yearly", priority: 0.2 },
    { url: `${brand.domain}/terms`, lastModified: OTHER_PAGE_LAST_MODIFIED.terms, changeFrequency: "yearly", priority: 0.2 },
    { url: `${brand.domain}${PAGE_SEO.blog.path}`, lastModified: PAGE_SEO.blog.lastModified, changeFrequency: "weekly", priority: 0.6 },
    ...BLOG_POSTS.map((p) => ({
      url: `${brand.domain}/blog/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...authorEntries,
    ...VS_PAGES.map((p) => ({
      url: `${brand.domain}/vs/${p.slug}`,
      lastModified: OTHER_PAGE_LAST_MODIFIED.vsPages,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...destinations.map((d) => ({
      url: `${brand.domain}/travel/${d.slug}`,
      lastModified: OTHER_PAGE_LAST_MODIFIED.travelGuides,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}

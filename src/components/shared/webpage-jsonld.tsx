import { brand } from "@/lib/config/brand";
import { organizationRef, safeJsonLd } from "@/lib/seo";

type WebPageType = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";

/**
 * A page-level schema.org WebPage (or subtype) block: what THIS page is, its
 * name and description, when it last changed, and which site and publisher it
 * belongs to. Every site page already carried the site-wide Organization
 * node, plus FAQPage/BreadcrumbList where relevant -- but those describe the
 * business and supporting structure, not the page itself, and the heycatch
 * SEO audit (g_structured_data) only counted the homepage, which also has a
 * primary-entity block (SoftwareApplication). `dateModified` comes from
 * page-seo.ts, the same source the sitemap's lastmod reads.
 */
export function WebPageJsonLd({
  type = "WebPage",
  path,
  name,
  description,
  dateModified,
  about,
  mainEntity,
}: {
  type?: WebPageType;
  /** Root-relative, e.g. "/pricing". */
  path: string;
  name: string;
  description: string;
  /** YYYY-MM-DD */
  dateModified: string;
  /** What the page is about, as a schema.org node (e.g. a TouristDestination). */
  about?: Record<string, unknown>;
  /** The page's primary entity, as a schema.org node (e.g. a Blog for a blog index). */
  mainEntity?: Record<string, unknown>;
}) {
  const url = `${brand.domain}${path}`;
  const data = {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    dateModified,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: brand.name, url: brand.domain },
    publisher: organizationRef(),
    ...(about ? { about } : {}),
    ...(mainEntity ? { mainEntity } : {}),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}

import { brand } from "@/lib/config/brand";
import { safeJsonLd } from "@/lib/seo";

/**
 * Organization structured data, present on every page (mounted in the root
 * layout) so search engines and AI assistants can answer "What is Zolo?"
 * without crawling further. `name` is "Discover Zolo" (with `alternateName:
 * "Zolo"`), not just "Zolo" — "zolo" alone is an extremely crowded brand term
 * (Zolo.ca real estate, ZoloStays co-living, Zolo.com toys, etc.), so Google
 * needs a more distinct entity name to disambiguate this business from all
 * of them. Still no `sameAs` social links — the handles in brand.ts
 * (@zoloapp on X, @zolo on Instagram) were checked and belong to unrelated
 * third parties (a dormant account from 2013 and someone's private personal
 * account, respectively), not this business. Add real ones here once this
 * business actually claims its own accounts.
 *
 * SoftwareApplication schema moved out of here (2026-09-16, see
 * software-application-jsonld.tsx) — it used to be mounted site-wide, which
 * an SEO brief flagged: that schema type describes one specific application
 * and Google's own guidance is to scope it to the page that actually
 * represents it, not repeat it on every page including /faq, /privacy, etc.
 */
export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Discover Zolo",
    alternateName: brand.name,
    url: brand.domain,
    logo: `${brand.domain}/icon.png`,
    description: brand.description,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(organization) }} />;
}

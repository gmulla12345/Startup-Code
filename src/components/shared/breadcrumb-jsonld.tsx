import { brand } from "@/lib/config/brand";

/**
 * BreadcrumbList structured data for non-homepage pages. `items` excludes
 * Home — it's always prepended here so every caller doesn't have to repeat
 * `{ name: "Home", path: "/" }`.
 */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const trail = [{ name: "Home", path: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${brand.domain}${item.path}`,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

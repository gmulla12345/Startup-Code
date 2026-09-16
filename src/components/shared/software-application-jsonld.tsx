import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";

/**
 * SoftwareApplication structured data — homepage only (mounted in
 * (marketing)/page.tsx), not site-wide. Split out of site-jsonld.tsx
 * 2026-09-16: this schema type describes one specific application, and
 * repeating it on every page (faq, privacy, careers, ...) diluted which page
 * it actually referred to. The homepage is what represents the application
 * itself. Pricing reads from pricing.ts, the same source every price
 * display on the site already uses, so it can't drift out of sync with what
 * Stripe actually charges.
 */
export function SoftwareApplicationJsonLd() {
  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: brand.name,
    description: brand.description,
    url: brand.domain,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: pricing.free.name,
        price: "0",
        priceCurrency: "USD",
        description: pricing.free.description,
      },
      {
        "@type": "Offer",
        name: pricing.premium.name,
        price: String(pricing.premium.priceMonthly),
        priceCurrency: "USD",
        description: pricing.premium.description,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(pricing.premium.priceMonthly),
          priceCurrency: "USD",
          billingDuration: "P1M",
        },
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }} />
  );
}

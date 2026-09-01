import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";

/**
 * Organization + SoftwareApplication structured data, present on every page
 * (mounted in the root layout) so search engines and AI assistants can
 * answer "What is Zolo?" / "How much does Zolo cost?" without crawling
 * further. No `sameAs` social links — the handles in brand.ts
 * (@zoloapp on X, @zolo on Instagram) were checked and belong to unrelated
 * third parties (a dormant account from 2013 and someone's private personal
 * account, respectively), not this business. Add real ones here if/when
 * this business actually claims its own accounts.
 */
export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: brand.domain,
    logo: `${brand.domain}/icon.png`,
    description: brand.description,
  };

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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }} />
    </>
  );
}

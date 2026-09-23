import type { Metadata } from "next";
import { SoftwareApplicationJsonLd } from "@/components/shared/software-application-jsonld";
import { Hero } from "@/components/marketing/hero";
import { PhotoStrip } from "@/components/marketing/photo-strip";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { ExampleRecommendations } from "@/components/marketing/example-recommendations";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ComparisonLinks } from "@/components/marketing/comparison-links";
import { DestinationsSection } from "@/components/marketing/destinations-section";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";
import { DiscoveryLayer } from "@/components/marketing/discovery-layer";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { Reveal } from "@/components/marketing/reveal";
import { getExperienceProvider } from "@/services/providers";

// `absolute` bypasses the root layout's "%s · Zolo" title template — this
// is the one page that needs an exact, non-templated title for SEO (see
// CLAUDE.md "Homepage title tag" for why: search-result real estate, no
// category keywords in the old default). `description` isn't set here, so
// it's inherited from the root layout's metadata unchanged, per the brief.
//
// `openGraph`/`twitter` ARE set here (heycatch audit D5.5): the root
// layout's openGraph.title still reads "Zolo — Experience more of life.",
// brand.tagline's original copy, which drifted out of sync once the hero
// H1/subhead were rewritten around "Stop deciding. Start doing." — sharing
// the homepage link showed a stale preview. Setting a page-level openGraph
// object here replaces (not merges with) the root's per Next.js metadata
// rules, so `images` is spread back in from the same og-image.png default
// rather than silently dropping it.
const OG_TITLE = "Zolo — Stop deciding. Start doing.";
const OG_DESCRIPTION =
  "A short, curated list of things to do — matched to your interests, budget, and personality, with a reason for every pick.";

export const metadata: Metadata = {
  title: { absolute: "Zolo — Personalized Discovery for Things to Do Near You" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: OG_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default async function LandingPage() {
  const provider = await getExperienceProvider();
  const featured = await provider.list({ city: "New York", latitude: 40.7128, longitude: -74.006, radiusMiles: 15, limit: 12 });

  return (
    <>
      <SoftwareApplicationJsonLd />
      <Hero />
      <PhotoStrip experiences={featured.slice(0, 5)} />
      <Reveal><FeatureGrid /></Reveal>
      <Reveal><ExampleRecommendations experiences={featured.slice(5, 8)} /></Reveal>
      <Reveal><HowItWorks experiences={featured.slice(8, 12)} /></Reveal>
      <Reveal><ComparisonLinks /></Reveal>
      <DestinationsSection />
      <Reveal><SocialProof /></Reveal>
      <Reveal><PricingSection /></Reveal>
      <Reveal><DiscoveryLayer /></Reveal>
      <Reveal><FAQ /></Reveal>
      <Reveal><CTASection /></Reveal>
    </>
  );
}

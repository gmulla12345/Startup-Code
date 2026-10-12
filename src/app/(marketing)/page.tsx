import type { Metadata } from "next";
import { SoftwareApplicationJsonLd } from "@/components/shared/software-application-jsonld";
import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ComparisonLinks } from "@/components/marketing/comparison-links";
import { DestinationsSection } from "@/components/marketing/destinations-section";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";
import { DiscoveryLayer } from "@/components/marketing/discovery-layer";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { Reveal } from "@/components/marketing/reveal";

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

// No live Google data anywhere on this page: the hero, feature cards, and How It
// Works are all designed product mockups (see components/marketing/mock-ui.tsx),
// so the homepage costs nothing in Places API calls and renders identically
// whether or not the Google account is in good standing. (It used to fetch a
// New York feed for a photo strip -- the strip, and that fetch, are gone.)
export default function LandingPage() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <Hero />
      <Reveal><SocialProof /></Reveal>
      <Reveal><FeatureGrid /></Reveal>
      <Reveal><HowItWorks /></Reveal>
      <Reveal><ComparisonLinks /></Reveal>
      <DestinationsSection />
      <Reveal><PricingSection /></Reveal>
      <Reveal><DiscoveryLayer /></Reveal>
      <Reveal><FAQ /></Reveal>
      <Reveal><CTASection /></Reveal>
    </>
  );
}

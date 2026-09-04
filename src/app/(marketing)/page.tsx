import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { ExampleRecommendations } from "@/components/marketing/example-recommendations";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { getExperienceProvider } from "@/services/providers";

// `absolute` bypasses the root layout's "%s · Zolo" title template — this
// is the one page that needs an exact, non-templated title for SEO (see
// CLAUDE.md "Homepage title tag" for why: search-result real estate, no
// category keywords in the old default). `description` isn't set here, so
// it's inherited from the root layout's metadata unchanged, per the brief.
export const metadata: Metadata = {
  title: { absolute: "Zolo — Personalized Discovery for Things to Do Near You" },
};

export default async function LandingPage() {
  const provider = await getExperienceProvider();
  const featured = await provider.list({ city: "New York", latitude: 40.7128, longitude: -74.006, radiusMiles: 15, limit: 6 });

  return (
    <>
      <Hero previewExperiences={featured.slice(0, 3)} />
      <FeatureGrid />
      <ExampleRecommendations experiences={featured.slice(3, 6)} />
      <HowItWorks />
      <SocialProof />
      <PricingSection />
      <FAQ />
      <CTASection />
    </>
  );
}

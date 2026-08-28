import { Hero } from "@/components/marketing/hero";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { ExampleRecommendations } from "@/components/marketing/example-recommendations";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SocialProof } from "@/components/marketing/social-proof";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FAQ } from "@/components/marketing/faq";
import { CTASection } from "@/components/marketing/cta-section";
import { getExperienceProvider } from "@/services/providers";

export default async function LandingPage() {
  const provider = await getExperienceProvider();
  const featured = await provider.list({ city: "New York", limit: 3 });

  return (
    <>
      <Hero />
      <FeatureGrid />
      <ExampleRecommendations experiences={featured} />
      <HowItWorks />
      <SocialProof />
      <PricingSection />
      <FAQ />
      <CTASection />
    </>
  );
}

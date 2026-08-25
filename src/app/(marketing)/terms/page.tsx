import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="August 22, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of {brand.name}&apos;s website and app (the
        &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these Terms.
      </p>

      <section>
        <h2>1. Eligibility</h2>
        <p>You must be at least 16 years old to use the Service. By using it, you represent that you meet this requirement.</p>
      </section>

      <section>
        <h2>2. Your Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity under your account. Notify us immediately of any unauthorized use.
        </p>
      </section>

      <section>
        <h2>3. The Service</h2>
        <p>
          {brand.name} provides personalized recommendations for real-world experiences, activities, and travel
          using a combination of structured filtering, deterministic scoring, and AI-generated reasoning.
        </p>
        <ul>
          <li>Recommendations are suggestions, not guarantees — always verify pricing, availability, hours, and
            requirements directly with the business or venue before visiting.</li>
          <li>Where the Service links to a third-party booking page, that booking is between you and the third
            party; {brand.name} is not a party to that transaction and is not responsible for it.</li>
          <li>We do not fabricate business information. Where live data isn&apos;t available, the Service will say
            so rather than guess.</li>
        </ul>
      </section>

      <section>
        <h2>4. Subscriptions and Payment</h2>
        <p>
          {brand.name} offers a free plan and a paid Premium plan (currently ${pricing.premium.priceMonthly}/month,
          subject to change with notice). By subscribing, you authorize us (via Stripe) to charge your payment
          method on a recurring basis until you cancel. You can cancel anytime from your Profile; you&apos;ll
          keep Premium access through the end of the current billing period. Fees are non-refundable except
          where required by law.
        </p>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or to violate any third party&apos;s rights.</li>
          <li>Attempt to reverse-engineer, scrape at scale, or interfere with the Service&apos;s operation.</li>
          <li>Upload false, defamatory, or infringing content (including reviews or profile content).</li>
          <li>Circumvent usage limits, subscription tiers, or security controls.</li>
        </ul>
      </section>

      <section>
        <h2>6. User Content</h2>
        <p>
          You retain ownership of content you submit (reviews, saved collections, itineraries you make public).
          By submitting it, you grant {brand.name} a non-exclusive, worldwide, royalty-free license to display
          and distribute it as part of operating the Service, including on shared itinerary links you create.
        </p>
      </section>

      <section>
        <h2>7. Intellectual Property</h2>
        <p>
          The Service, including its design, code, and branding, is owned by {brand.name} and protected by
          intellectual property laws. You may not copy or redistribute it without permission.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee that
          recommendations will be accurate, complete, or suited to your needs, or that the Service will be
          uninterrupted or error-free. You use recommended experiences at your own risk.
        </p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, {brand.name} is not liable for any indirect, incidental, or
          consequential damages arising from your use of the Service, including from experiences, venues, or
          third-party bookings discovered through it.
        </p>
      </section>

      <section>
        <h2>10. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or terminate
          accounts that violate these Terms.
        </p>
      </section>

      <section>
        <h2>11. Changes to These Terms</h2>
        <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance.</p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>Questions about these Terms? Email us at {brand.supportEmail}.</p>
      </section>
    </LegalPage>
  );
}

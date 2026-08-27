import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { brand } from "@/lib/config/brand";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 27, 2026">
      <p>
        This Privacy Policy explains how {brand.name} (&ldquo;{brand.name}&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
        collects, uses, and protects your information when you use our website and app (the &ldquo;Service&rdquo;).
        By using the Service, you agree to the collection and use of information as described here.
      </p>

      <section>
        <h2>1. Information We Collect</h2>
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account information</strong> — name, email address, and password (encrypted) when you sign up,
            or your Google account identifier if you sign in with Google.
          </li>
          <li>
            <strong>Profile and preference data</strong> — age range, city, interests, personality preferences,
            budget and travel preferences, and lifestyle goals you provide during onboarding.
          </li>
          <li>
            <strong>Location data</strong> — the city/coordinates you provide, used to personalize nearby
            recommendations. We do not track continuous or background location.
          </li>
          <li>
            <strong>Usage data</strong> — experiences you view, save, dismiss, share, or book, searches you perform,
            and features you use, so we can improve your recommendations.
          </li>
          <li>
            <strong>Payment data</strong> — if you subscribe to Premium, payments are processed by Stripe, Inc. We
            never receive or store your full card number.
          </li>
          <li>
            <strong>Device and log data</strong> — IP address, browser type, and standard web server logs.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To generate personalized recommendations, including by sending relevant profile and behavioral
            signals to our AI provider (Anthropic) to produce reasoning for suggested experiences.</li>
          <li>To operate core features: saving experiences, planning trips, and processing subscriptions.</li>
          <li>To communicate with you about your account, transactions, and (only if you opt in) product updates.</li>
          <li>To maintain the security, integrity, and performance of the Service.</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Share Information</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul>
          <li><strong>Supabase</strong> (our database and authentication provider), which stores your account and profile data.</li>
          <li><strong>Anthropic</strong>, which processes profile and context data to generate AI recommendation reasoning. Anthropic does not receive your name, email, or payment details.</li>
          <li><strong>Stripe</strong>, which processes subscription payments on our behalf.</li>
          <li><strong>Google</strong>, for location geocoding and map display, and for real-world place data and photos where the Service provides live discovery results.</li>
          <li><strong>Resend</strong>, which sends transactional emails on our behalf (account confirmation, password reset, and similar account-related messages).</li>
          <li><strong>Sentry</strong>, which helps us detect and diagnose technical errors. Error reports may include IP address and request context, but never your password or payment details.</li>
          <li><strong>Vercel</strong>, our hosting provider, which processes standard web traffic and log data to serve the Service.</li>
          <li>Other users, only for information you explicitly choose to make public (e.g., a shared itinerary link, or a public social profile if you enable one).</li>
          <li>Law enforcement or regulators, only where required by law.</li>
        </ul>
      </section>

      <section>
        <h2>4. Your Rights and Choices</h2>
        <ul>
          <li>Access, correct, or delete your profile information at any time from your Profile settings.</li>
          <li>Request a copy of your data or full account deletion by contacting us at {brand.supportEmail}.</li>
          <li>Residents of the EEA/UK and California have additional rights under GDPR and CCPA, including the
            right to access, delete, or restrict processing of your personal data, and the right to lodge a
            complaint with a supervisory authority.</li>
          <li>Opt out of non-essential emails at any time via the unsubscribe link.</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Retention</h2>
        <p>
          We retain your account and profile data for as long as your account is active. If you delete your
          account, we delete or anonymize your personal data within 30 days, except where retention is required
          for legal, tax, or fraud-prevention purposes.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          We use industry-standard safeguards, including encryption in transit, Row Level Security at the
          database level, and access controls limiting who can view your data. No method of transmission or
          storage is 100% secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>7. Children&apos;s Privacy</h2>
        <p>The Service is not directed to children under 16, and we do not knowingly collect data from them.</p>
      </section>

      <section>
        <h2>8. International Users</h2>
        <p>
          Your information may be processed in the United States or other countries where our service providers
          operate. By using the Service, you consent to this transfer.
        </p>
      </section>

      <section>
        <h2>9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will post the updated version here with a new
          &ldquo;Last updated&rdquo; date.</p>
      </section>

      <section>
        <h2>10. Contact Us</h2>
        <p>Questions about this policy? Email us at {brand.supportEmail}.</p>
      </section>
    </LegalPage>
  );
}

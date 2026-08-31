import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { brand } from "@/lib/config/brand";
import { pricing } from "@/lib/config/pricing";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="August 30, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) form a legally binding agreement between you and{" "}
        {brand.name}, governing your access to and use of the website at{" "}
        <a href="https://discoverzolo.com/">discoverzolo.com</a> and the {brand.name} application (together, the
        &ldquo;Service&rdquo;). By creating an account, subscribing, or otherwise using the Service, you agree to
        these Terms. If you do not agree, do not use the Service.
      </p>
      <p>
        Please also review our <a href="https://discoverzolo.com/privacy">Privacy Policy</a>, which explains how we
        collect and use your information and is incorporated into these Terms by reference.
      </p>

      <section id="key-points">
        <h2>Summary of key points</h2>
        <p>This summary highlights a few key points. The full Terms below control.</p>
        <ul>
          <li>
            <strong>What is {brand.name}?</strong> A subscription service (SaaS) that gives you personalized
            recommendations for real-world experiences, activities, and travel, using a mix of structured
            filtering, deterministic scoring, and AI-generated reasoning.
          </li>
          <li>
            <strong>Who can use it?</strong> You must be at least 16 years old.
          </li>
          <li>
            <strong>Is there a free trial?</strong> Yes. New Premium subscriptions include a 7-day free trial. Your
            card is charged automatically when the trial ends unless you cancel first.
          </li>
          <li>
            <strong>Can I cancel anytime?</strong> Yes, from your Profile, at any time. You keep access through the
            end of the period you already paid for.
          </li>
          <li>
            <strong>Does {brand.name} link to other sites?</strong> Yes. Booking links go to third-party businesses
            we don&apos;t own or control, and the Service uses Google Maps Platform for maps and place data.
          </li>
          <li>
            <strong>How are disputes handled?</strong> Through informal negotiation first, then binding individual
            arbitration in Maryland rather than court, as described below.
          </li>
        </ul>
      </section>

      <section id="eligibility">
        <h2>1. Eligibility</h2>
        <p>
          You must be at least 16 years old to use the Service. By using the Service, you represent and warrant
          that you meet this requirement and that you have the legal capacity to enter into these Terms. If you are
          using the Service on behalf of someone else, you represent that you are authorized to accept these Terms
          on their behalf.
        </p>
      </section>

      <section id="the-service">
        <h2>2. The Service</h2>
        <p>
          {brand.name} provides personalized recommendations for real-world experiences, activities, and travel
          planning, delivered through a home feed, discovery search, a weekend planner, and travel mode. The
          Service is offered on a subscription (software-as-a-service) basis for your personal, non-commercial use.
        </p>
        <ul>
          <li>
            Recommendations are suggestions, not guarantees. Always verify pricing, availability, hours, and
            requirements directly with the business or venue before visiting.
          </li>
          <li>
            Where the Service links to a third-party booking page, that booking is a transaction between you and
            the third party. {brand.name} is not a party to it and is not responsible for it.
          </li>
          <li>
            We do not fabricate business information. Where live data is not available, the Service will say so
            rather than guess.
          </li>
          <li>
            The Service uses Google Maps Platform APIs (Places and Geocoding) for location search and real,
            live place data — including photos, ratings, and addresses sourced directly from Google. By using
            the Service, you are also bound by Google&apos;s Terms of Service, available at{" "}
            <a href="https://cloud.google.com/maps-platform/terms" target="_blank" rel="noopener noreferrer">
              cloud.google.com/maps-platform/terms
            </a>
            .
          </li>
          <li>
            Some recommendation reasoning is generated using AI. AI-generated text is a supplement to, not a
            replacement for, the underlying data. It can only refine explanations for options our own scoring
            engine has already selected; it cannot invent a price, address, or business.
          </li>
        </ul>
      </section>

      <section id="accounts">
        <h2>3. Accounts</h2>
        <p>
          You need an account to use most of the Service. You can register with an email and password, or sign in
          with Google. You are responsible for maintaining the confidentiality of your account credentials and for
          all activity that occurs under your account. Notify us immediately at {brand.supportEmail} if you suspect
          unauthorized use.
        </p>
        <p>You agree to provide accurate, current, and complete information when you register, and to keep it updated.</p>
      </section>

      <section id="subscriptions">
        <h2>4. Subscriptions, Free Trial, and Payment</h2>
        <p>
          {brand.name} offers a Free plan and a paid Premium plan, currently ${pricing.premium.priceMonthly}/month
          in U.S. dollars, subject to change with advance notice. We accept Visa, Mastercard, American Express, and
          Discover, processed securely by Stripe; we never see or store your full card number.
        </p>
        <p>
          <strong>Free trial.</strong> New Premium subscriptions include a 7-day free trial. If you do not cancel
          before the trial ends, your payment method will automatically be charged the then-current Premium price,
          and your subscription will continue on a recurring monthly basis until you cancel.
        </p>
        <p>
          <strong>Auto-renewal and cancellation.</strong> By subscribing, you authorize us to charge your payment
          method on a recurring monthly basis until you cancel. You can cancel anytime from your Profile. If you
          cancel, you keep Premium access through the end of the period you already paid for (or, if still in your
          free trial, through the end of the trial), and you will not be charged again.
        </p>
        <p>
          <strong>Refunds.</strong> Fees already charged are non-refundable, except where required by law. To
          avoid being charged, cancel before your free trial ends or before your next renewal date.
        </p>
      </section>

      <section id="user-representations">
        <h2>5. User Representations</h2>
        <p>
          By using the Service, you represent that all information you provide is truthful and accurate, that you
          will maintain its accuracy, and that you will use the Service only for lawful purposes in accordance with
          these Terms.
        </p>
      </section>

      <section id="user-content">
        <h2>6. Your Content</h2>
        <p>
          The Service lets you build personal saved collections and itineraries, and optionally share an itinerary
          with others through a link you generate. You retain ownership of the itineraries and collections you
          create. By generating a shareable link, you grant {brand.name} a non-exclusive, worldwide, royalty-free
          license to host and display that content to anyone who has the link, solely to operate that feature. The
          Service does not currently offer public posting of reviews, comments, photos, or other content visible to
          other users at large.
        </p>
      </section>

      <section id="third-party">
        <h2>7. Third-Party Links and Content</h2>
        <p>
          The Service contains links to third-party websites and services we do not own or control, including
          business and venue booking pages and Google Maps Platform place data. We are not responsible for the
          content, accuracy, or practices of any third-party site, and linking to it does not imply our endorsement.
          You access third-party sites at your own risk and should review their own terms and privacy policies.
        </p>
        <p>{brand.name} does not host third-party advertising on the Service.</p>
      </section>

      <section id="prohibited">
        <h2>8. Prohibited Activities</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in violation of any third party&apos;s rights.</li>
          <li>Systematically scrape, harvest, or extract data from the Service.</li>
          <li>Attempt to reverse-engineer, decompile, or interfere with the Service&apos;s operation or security.</li>
          <li>Circumvent usage limits, subscription tiers, rate limits, or access controls.</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
          <li>Use the Service to transmit malware or engage in any activity that disrupts or damages the Service.</li>
          <li>Use automated means (bots, scripts) to access the Service except through APIs we officially provide.</li>
        </ul>
      </section>

      <section id="ip">
        <h2>9. Intellectual Property Rights</h2>
        <p>
          The Service, including its design, code, text, graphics, and branding, is owned by {brand.name} or our
          licensors and is protected by copyright, trademark, and other intellectual property laws. Subject to your
          compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to
          access and use the Service for your personal, non-commercial use. You may not copy, modify, distribute,
          sell, or lease any part of the Service without our prior written permission.
        </p>
      </section>

      <section id="term-termination">
        <h2>10. Term and Termination</h2>
        <p>
          These Terms remain in effect while you use the Service. You may stop using the Service and delete your
          account at any time from your Profile. We may suspend or terminate your account, without notice, if you
          violate these Terms or if we reasonably believe your use poses a risk to the Service or other users.
        </p>
      </section>

      <section id="governing-law">
        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the State of Maryland, United States, without regard to its
          conflict-of-law principles, except as otherwise required by the informal negotiation and arbitration
          agreement below.
        </p>
      </section>

      <section id="disputes">
        <h2>12. Dispute Resolution</h2>
        <p>
          <strong>Informal negotiations.</strong> Before filing a claim, you agree to first contact us at{" "}
          {brand.supportEmail} and attempt to resolve the dispute informally for at least 30 days.
        </p>
        <p>
          <strong>Binding arbitration.</strong> If informal negotiations do not resolve the dispute, any claim
          arising out of or relating to these Terms or the Service will be resolved by binding arbitration
          conducted in the State of Maryland, United States, rather than in court, except that either party may
          bring an individual claim in small claims court. We will pay arbitration fees where they would otherwise
          be excessive for you to bear. Arbitration will be on an individual basis; class actions and class
          arbitrations are not permitted.
        </p>
      </section>

      <section id="liability">
        <h2>13. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, in no event will {brand.name}, its officers, or employees be
          liable to you for any indirect, incidental, consequential, or punitive damages arising from your use of
          the Service, including from experiences, venues, or third-party bookings discovered through it. Our total
          liability to you for any claim arising from these Terms or the Service will not exceed the amount you
          paid us, if any, in the 12 months before the claim arose.
        </p>
      </section>

      <section id="indemnification">
        <h2>14. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold {brand.name} harmless from any loss, damage, or expense
          (including reasonable attorneys&apos; fees) arising from your use of the Service or your violation of
          these Terms.
        </p>
      </section>

      <section id="disclaimers">
        <h2>15. Disclaimers</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any
          kind, express or implied. We do not guarantee that recommendations will be accurate, complete, or suited
          to your needs, or that the Service will be uninterrupted, timely, secure, or error-free. You use
          recommended experiences at your own risk.
        </p>
      </section>

      <section id="time-limit">
        <h2>16. Time Limitation on Claims</h2>
        <p>
          Any cause of action or claim you may have arising out of or relating to these Terms or the Service must
          be brought within one (1) year after the claim arose, or it is permanently barred.
        </p>
      </section>

      <section id="misc">
        <h2>17. Miscellaneous</h2>
        <p>
          If any provision of these Terms is found unenforceable, the remaining provisions will remain in full
          effect. Our failure to enforce any provision is not a waiver of it. These Terms, together with our
          Privacy Policy, are the entire agreement between you and {brand.name} regarding the Service. You may not
          assign these Terms without our consent; we may assign them freely.
        </p>
      </section>

      <section id="changes">
        <h2>18. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. If we make material changes, we will notify you by posting
          the updated Terms on this page with a new &ldquo;Last updated&rdquo; date, and where appropriate, by
          emailing you. Continued use of the Service after changes take effect constitutes acceptance of the
          updated Terms.
        </p>
      </section>

      <section id="contact">
        <h2>19. Contact Us</h2>
        <p>
          Questions about these Terms? Email us at {brand.supportEmail}, or visit{" "}
          <a href="https://discoverzolo.com/contact">discoverzolo.com/contact</a>.
        </p>
      </section>
    </LegalPage>
  );
}

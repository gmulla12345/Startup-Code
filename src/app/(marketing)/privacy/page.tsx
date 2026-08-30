import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { brand } from "@/lib/config/brand";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 29, 2026">
      <p>
        This Privacy Notice for {brand.name} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) describes how
        and why we might access, collect, store, use, and/or share (&ldquo;process&rdquo;) your personal information
        when you use our services (&ldquo;Services&rdquo;), including when you visit our website at{" "}
        <a href="https://discoverzolo.com/">discoverzolo.com</a>, create an account, or otherwise engage with us.
      </p>
      <p>
        Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices.
        We are responsible for making decisions about how your personal information is processed. If you do not
        agree with our policies and practices, please do not use the Services. If you still have questions, contact
        us at <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
      </p>

      <section id="key-points">
        <h2>Summary of key points</h2>
        <p>
          This summary provides key points from our Privacy Notice, but you can find out more details about any of
          these topics below.
        </p>
        <ul>
          <li>
            <strong>What personal information do we process?</strong> Depending on how you interact with us, we may
            process names, email addresses, passwords, authentication data, and billing addresses.
          </li>
          <li>
            <strong>Do we process sensitive personal information?</strong> No. We do not process sensitive
            information such as racial or ethnic origin, sexual orientation, or religious beliefs.
          </li>
          <li>
            <strong>Do we collect information from third parties?</strong> Yes — if you sign in with Google, we
            receive basic profile information from Google as part of that flow.
          </li>
          <li>
            <strong>How do we process your information?</strong> To provide and improve the Services, communicate
            with you, generate AI-powered recommendation reasoning, prevent fraud, and comply with the law.
          </li>
          <li>
            <strong>How do we keep your information safe?</strong> Encryption in transit, database-level Row Level
            Security, and access controls — though no method of transmission is 100% secure.
          </li>
          <li>
            <strong>What are your rights?</strong> Depending on where you live, you may have rights to access,
            correct, delete, or restrict processing of your personal information.
          </li>
          <li>
            <strong>How do you exercise your rights?</strong> The easiest way is by visiting{" "}
            <a href="https://discoverzolo.com/contact">discoverzolo.com/contact</a>, or emailing us.
          </li>
        </ul>
      </section>

      <section id="collect">
        <h2>1. What information do we collect?</h2>
        <h3>Personal information you disclose to us</h3>
        <p>
          <strong>In short:</strong> we collect personal information that you voluntarily provide when you register,
          express interest in our Services, or otherwise contact us.
        </p>
        <p>The personal information we collect may include:</p>
        <ul>
          <li>Names</li>
          <li>Email addresses</li>
          <li>Passwords</li>
          <li>Contact or authentication data (including your Google account identifier, if you sign in with Google)</li>
          <li>Billing addresses</li>
        </ul>
        <p>
          <strong>Sensitive information.</strong> We do not process sensitive information (racial or ethnic origin,
          sexual orientation, religious beliefs, health data, or similar categories).
        </p>
        <p>
          <strong>Payment data.</strong> If you subscribe to Premium, payment data (such as your card number) is
          collected and processed directly by Stripe, our payment processor — we never receive or store your full
          card number. See{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
            Stripe&apos;s Privacy Notice
          </a>
          .
        </p>
        <p>
          <strong>Social login data.</strong> If you register using your Google account, we receive certain profile
          information about you from Google, as described under{" "}
          <a href="#social-logins">How do we handle your social logins?</a> below.
        </p>

        <h3>Information automatically collected</h3>
        <p>
          <strong>In short:</strong> some information — such as your IP address and browser/device characteristics —
          is collected automatically when you use the Services.
        </p>
        <p>
          This information does not reveal your specific identity but may include device and usage information, your
          IP address, browser and device characteristics, operating system, and information about how and when you
          use the Services. We use this primarily to maintain security and operation of the Services, and for
          internal analytics.
        </p>
        <ul>
          <li>
            <em>Log and usage data.</em> Service-related, diagnostic, usage, and performance information our servers
            collect automatically, including your activity in the app (pages viewed, saves, dismissals, searches)
            and error reports.
          </li>
          <li>
            <em>Location data.</em> The city and coordinates you provide during onboarding, used to personalize
            nearby recommendations. We do not track continuous or background device location. You can decline to
            provide this, though some features (like nearby discovery) may not work as well.
          </li>
        </ul>
        <p>
          <strong>Google API.</strong> Our use of information received from Google APIs adheres to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
            Google API Services User Data Policy
          </a>
          , including the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" target="_blank" rel="noopener noreferrer">
            Limited Use requirements
          </a>
          .
        </p>

        <h3>Information collected from other sources</h3>
        <p>
          <strong>In short:</strong> if you sign in with Google, we receive limited profile information from Google
          as part of that authentication flow.
        </p>
        <p>
          If you register using your Google account, we receive certain profile information about you from Google —
          typically your name and email address. Any personal information we receive this way depends on your
          Google account&apos;s own privacy settings; Google&apos;s use of your information is governed by
          Google&apos;s own privacy notice, not this one.
        </p>
      </section>

      <section id="process">
        <h2>2. How do we process your information?</h2>
        <p>
          <strong>In short:</strong> we process your information to provide, improve, and administer the Services,
          communicate with you, for security and fraud prevention, and to comply with the law.
        </p>
        <ul>
          <li>
            <strong>To create and manage your account.</strong> So you can create and log in to your account and
            keep it in working order.
          </li>
          <li>
            <strong>To deliver the Services.</strong> Including generating your personalized recommendations.
          </li>
          <li>
            <strong>To respond to inquiries and offer support.</strong> Including requests sent via our contact form
            or email.
          </li>
          <li>
            <strong>To send administrative information.</strong> Details about your account, transactions, or
            changes to our terms and policies.
          </li>
          <li>
            <strong>To fulfill and manage your orders.</strong> Including your Premium subscription, payments, and
            cancellations.
          </li>
          <li>
            <strong>To send marketing and promotional communications</strong>, if this is in accordance with your
            preferences. You can opt out at any time — see{" "}
            <a href="#rights">What are your privacy rights?</a> below.
          </li>
          <li>
            <strong>To protect the Services</strong>, including fraud monitoring and prevention.
          </li>
          <li>
            <strong>To identify usage trends</strong>, so we can understand how the Services are used and improve
            them.
          </li>
          <li>
            <strong>AI-powered recommendation reasoning.</strong> We send relevant profile and context data
            (interests, budget, and location preferences) to our AI provider, Anthropic, to generate natural-language
            reasoning that explains why a specific experience was recommended to you.
          </li>
        </ul>
      </section>

      <section id="legal-bases">
        <h2>3. What legal bases do we rely on to process your information?</h2>
        <p>
          <strong>In short:</strong> we only process your personal information when we have a valid legal reason to
          do so — such as your consent, to fulfill a contract, to comply with the law, or for our legitimate
          business interests.
        </p>
        <p>
          <strong>If you are located in the EU or UK</strong>, the GDPR and UK GDPR require us to explain the legal
          bases we rely on:
        </p>
        <ul>
          <li>
            <strong>Consent.</strong> Where you have given us permission to use your information for a specific
            purpose. You can withdraw consent at any time.
          </li>
          <li>
            <strong>Performance of a contract.</strong> Where processing is necessary to provide the Services you
            signed up for.
          </li>
          <li>
            <strong>Legitimate interests.</strong> Where we believe it is reasonably necessary to achieve our
            legitimate business interests, and those interests do not outweigh your rights — for example, to:
            <ul>
              <li>Send information about special offers and discounts</li>
              <li>Analyze how the Services are used so we can improve them</li>
              <li>Diagnose problems and prevent fraudulent activity</li>
              <li>
                Explain our recommendations transparently, so users understand why a suggestion fits them rather
                than receiving an unexplained black-box result
              </li>
            </ul>
          </li>
          <li>
            <strong>Legal obligations.</strong> Where necessary for compliance with the law, or to exercise or
            defend our legal rights.
          </li>
          <li>
            <strong>Vital interests.</strong> Where necessary to protect someone&apos;s vital interests, such as
            preventing harm.
          </li>
        </ul>
        <p>
          <strong>If you are located in Canada</strong>, we may process your information where you have given
          express or implied consent, or in certain legally permitted exceptions (e.g., fraud detection and
          prevention, or where required by a court order). You can withdraw consent at any time.
        </p>
      </section>

      <section id="share">
        <h2>4. When and with whom do we share your personal information?</h2>
        <p>
          <strong>In short:</strong> we may share information with the specific third parties listed below, and in
          certain other situations described here.
        </p>
        <p>
          We share your data with third-party vendors and service providers who perform services for us and require
          access to your information to do that work. We have contracts in place with each of them, which limit what
          they can do with your personal information.
        </p>
        <p>The third parties we share personal information with are:</p>
        <ul>
          <li>
            <strong>AI service providers</strong> — Anthropic (generates recommendation reasoning; never receives
            your name, email, or payment details)
          </li>
          <li>
            <strong>Functionality and infrastructure</strong> — Supabase (database and authentication)
          </li>
          <li>
            <strong>Invoicing and billing</strong> — Stripe (subscription payments)
          </li>
          <li>
            <strong>User account registration and authentication</strong> — Google Sign-In
          </li>
          <li>
            <strong>Website hosting</strong> — Vercel
          </li>
          <li>
            <strong>Website performance monitoring</strong> — Sentry (error reports may include IP address and
            request context, never your password or payment details)
          </li>
          <li>
            <strong>Transactional email</strong> — Resend (account confirmation, password reset, and similar
            account-related messages)
          </li>
          <li>
            <strong>Location &amp; places data</strong> — Google Maps Platform
          </li>
        </ul>
        <p>We may also need to share your personal information in these situations:</p>
        <ul>
          <li>
            <strong>Business transfers.</strong> In connection with, or during negotiations of, a merger, sale of
            company assets, financing, or acquisition of all or part of our business.
          </li>
          <li>
            <strong>Google Maps Platform APIs.</strong> We share information with Google Maps Platform APIs (e.g.,
            the Maps API, Places API) to provide location-based features. We store your provided location on our
            servers for personalization; you may revoke this at any time by contacting us.
          </li>
        </ul>
      </section>

      <section id="cookies">
        <h2>5. Do we use cookies and other tracking technologies?</h2>
        <p>
          <strong>In short:</strong> we use cookies to keep you signed in and to maintain the security of the
          Services.
        </p>
        <p>
          We use cookies for authentication and session management (via Supabase Auth), and similar technologies to
          maintain security, prevent crashes, and support basic site functionality. We do not use cookies for
          third-party advertising or retargeting.
        </p>
      </section>

      <section id="ai">
        <h2>6. Do we offer AI-based products?</h2>
        <p>
          <strong>In short:</strong> yes — features powered by AI are part of the Services.
        </p>
        <p>
          We provide AI-powered features through a third-party AI service provider, Anthropic. Relevant profile and
          context data is shared with and processed by Anthropic to enable these features, for the purposes
          described under <a href="#legal-bases">What legal bases do we rely on?</a> above.
        </p>
        <p>Our AI features are designed for:</p>
        <ul>
          <li>Personalized recommendations</li>
          <li>Content/text generation (the natural-language reasoning behind each recommendation)</li>
        </ul>
      </section>

      <section id="social-logins">
        <h2>7. How do we handle your social logins?</h2>
        <p>
          <strong>In short:</strong> if you register using your Google account, we may have access to certain
          information about you.
        </p>
        <p>
          The Services let you register and log in using your Google account. Where you choose to do this, we
          receive certain profile information from Google — typically your name, email address, and profile picture.
          We use this information only for the purposes described in this Privacy Notice. We do not control, and
          are not responsible for, Google&apos;s own use of your information — review Google&apos;s privacy policy
          to understand how they handle your data.
        </p>
      </section>

      <section id="international">
        <h2>8. Is your information transferred internationally?</h2>
        <p>
          <strong>In short:</strong> we may transfer, store, and process your information in countries other than
          your own.
        </p>
        <p>
          Our servers, and the servers of the third parties we work with, are located in the United States.
          Regardless of your location, your information may be transferred to, stored, and processed in the US and
          other countries.
        </p>
        <p>
          If you are located in the EEA, UK, or Switzerland, these countries may not have data protection laws as
          comprehensive as your own. We rely on the European Commission&apos;s Standard Contractual Clauses (SCCs)
          for transfers of personal information to our third-party providers, which require recipients to protect
          personal information originating from the EEA or UK in accordance with European data protection standards.
        </p>
      </section>

      <section id="retention">
        <h2>9. How long do we keep your information?</h2>
        <p>
          <strong>In short:</strong> we keep your information for as long as necessary to fulfill the purposes
          outlined in this notice, unless a longer period is required by law.
        </p>
        <p>
          We retain your account and profile data for as long as your account is active. If you delete your account,
          we delete or anonymize your personal data within 30 days, except where retention is required for legal,
          tax, or fraud-prevention purposes.
        </p>
      </section>

      <section id="safety">
        <h2>10. How do we keep your information safe?</h2>
        <p>
          <strong>In short:</strong> we aim to protect your information through technical and organizational
          security measures.
        </p>
        <p>
          We use encryption in transit, database-level Row Level Security, and access controls limiting who can view
          your data. However, no method of transmission over the internet or electronic storage is 100% secure, so
          we cannot guarantee absolute security.
        </p>
      </section>

      <section id="minors">
        <h2>11. Do we collect information from minors?</h2>
        <p>
          We do not knowingly collect data from, or market to, children under 16. By using the Services, you
          represent that you are at least 16, or that you are the parent/guardian of a minor and consent to their
          use of the Services. If we learn we have collected personal information from someone under 16, we will
          deactivate the account and delete the data. Contact us at{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> if you become aware of any such data.
        </p>
      </section>

      <section id="rights">
        <h2>12. What are your privacy rights?</h2>
        <p>
          Depending on where you live, you may have rights that give you greater access to and control over your
          personal information, including the right to access, correct, delete, or restrict processing of your
          information, and to data portability. You can make such a request by visiting{" "}
          <a href="https://discoverzolo.com/contact">discoverzolo.com/contact</a> or emailing{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
        </p>
        <p>
          <strong>Withdrawing consent.</strong> Where we rely on your consent to process your information, you can
          withdraw it at any time using the contact details above.
        </p>
        <p>
          <strong>Opting out of marketing.</strong> Unsubscribe at any time via the link in our marketing emails, or
          by contacting us. We may still send service-related messages necessary for your account.
        </p>
        <p>
          <strong>Account information.</strong> You can review or change your account information anytime from your
          Profile settings, or request full account deletion by contacting us. Upon deletion, we deactivate your
          account and remove your information from active use, though we may retain limited data to prevent fraud,
          comply with legal obligations, or resolve disputes.
        </p>
        <p>
          If you are in the UK and unhappy with how we&apos;ve handled your information, you may also complain to
          the{" "}
          <a href="https://ico.org.uk/make-a-complaint" target="_blank" rel="noopener noreferrer">
            Information Commissioner&apos;s Office
          </a>
          . If you are in the EEA, you may complain to your{" "}
          <a href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm" target="_blank" rel="noopener noreferrer">
            local data protection authority
          </a>
          . If you are in Switzerland, you may contact the{" "}
          <a href="https://www.edoeb.admin.ch/edoeb/en/home.html" target="_blank" rel="noopener noreferrer">
            Federal Data Protection and Information Commissioner
          </a>
          .
        </p>
      </section>

      <section id="dnt">
        <h2>13. Controls for Do-Not-Track features</h2>
        <p>
          There is currently no uniform technology standard for recognizing Do-Not-Track (&ldquo;DNT&rdquo;) signals,
          so we do not currently respond to DNT browser signals or similar mechanisms. If a standard is adopted that
          we must follow, we will update this notice.
        </p>
      </section>

      <section id="us-rights">
        <h2>14. Do United States residents have specific privacy rights?</h2>
        <p>
          <strong>In short:</strong> if you are a resident of California, Colorado, Connecticut, Delaware, Florida,
          Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode
          Island, Tennessee, Texas, Utah, or Virginia, you may have rights to access, correct, delete, or obtain a
          copy of your personal information.
        </p>

        <h3>Categories of personal information we collect</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4">Category</th>
                <th className="text-left py-2 pr-4">Examples</th>
                <th className="text-left py-2">Collected</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Identifiers", "Name, email address, online identifier, IP address", "Yes"],
                ["California Customer Records", "Name, contact information, billing/financial information", "Yes"],
                ["Protected classifications", "Age (age range only)", "Yes"],
                ["Commercial information", "Subscription/purchase and payment history", "Yes"],
                ["Biometric information", "Fingerprints, voiceprints", "No"],
                ["Internet/network activity", "Browsing behavior, interactions within the app", "Yes"],
                ["Geolocation data", "City/coordinates you provide", "Yes"],
                ["Audio/visual information", "Photos, audio, or video recordings", "No"],
                ["Professional/employment information", "Job history, portfolio (job applicants only)", "No"],
                ["Education information", "Student records", "No"],
                ["Inferences", "Preferences and characteristics inferred to personalize recommendations", "Yes"],
                ["Sensitive personal information", "—", "No"],
              ].map(([cat, ex, collected]) => (
                <tr key={cat} className="border-b border-border/50">
                  <td className="py-2 pr-4 align-top">{cat}</td>
                  <td className="py-2 pr-4 align-top">{ex}</td>
                  <td className="py-2 align-top">{collected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We retain each of these categories for as long as you have an account with us. We have not sold personal
          information to third parties for a business or commercial purpose in the preceding twelve months. We have
          disclosed Identifiers, California Customer Records information, Commercial information, Internet/network
          activity, and Geolocation data to our service providers (see{" "}
          <a href="#share">When and with whom do we share your personal information?</a>) for a business purpose in
          that time.
        </p>

        <h3>Your rights</h3>
        <ul>
          <li>Right to know whether we are processing your personal data</li>
          <li>Right to access your personal data</li>
          <li>Right to correct inaccuracies in your personal data</li>
          <li>Right to request deletion of your personal data</li>
          <li>Right to obtain a copy of the personal data you previously shared with us</li>
          <li>Right to non-discrimination for exercising your rights</li>
          <li>Right to opt out of processing for targeted advertising, sale, or certain profiling (not applicable — we do not engage in these practices)</li>
        </ul>
        <p>
          To exercise these rights, contact us via{" "}
          <a href="https://discoverzolo.com/contact">discoverzolo.com/contact</a> or{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>. We will need to verify your identity
          before acting on your request. If we decline to act on your request, you may appeal by emailing us; we
          will respond in writing, and if your appeal is denied you may complain to your state attorney general.
        </p>

        <h3>California &ldquo;Shine the Light&rdquo; law</h3>
        <p>
          California residents may request, once a year and free of charge, information about categories of
          personal information (if any) we&apos;ve disclosed to third parties for their own direct marketing
          purposes. We do not share personal information with third parties for their own direct marketing purposes,
          but if you&apos;d like to submit such a request, contact us using the details above.
        </p>
      </section>

      <section id="other-regions">
        <h2>15. Do other regions have specific privacy rights?</h2>
        <h3>Australia and New Zealand</h3>
        <p>
          We collect and process personal information under Australia&apos;s Privacy Act 1988 and New Zealand&apos;s
          Privacy Act 2020. You have the right to request access to or correction of your personal information at
          any time by contacting us. If you believe we are unlawfully processing your information, you may complain
          to the{" "}
          <a href="https://www.oaic.gov.au/privacy/privacy-complaints/lodge-a-privacy-complaint-with-us" target="_blank" rel="noopener noreferrer">
            Office of the Australian Information Commissioner
          </a>{" "}
          or the{" "}
          <a href="https://www.privacy.org.nz/your-rights/making-a-complaint/" target="_blank" rel="noopener noreferrer">
            Office of the New Zealand Privacy Commissioner
          </a>
          .
        </p>
        <h3>Republic of South Africa</h3>
        <p>
          You have the right to request access to or correction of your personal information at any time by
          contacting us. If unsatisfied with our response, you can contact{" "}
          <a href="https://inforegulator.org.za/" target="_blank" rel="noopener noreferrer">
            The Information Regulator (South Africa)
          </a>{" "}
          at{" "}
          <a href="mailto:enquiries@inforegulator.org.za">enquiries@inforegulator.org.za</a>.
        </p>
      </section>

      <section id="updates">
        <h2>16. Do we make updates to this notice?</h2>
        <p>
          Yes — we will update this notice as necessary to stay compliant with relevant laws. The updated version
          will be indicated by a revised &ldquo;Last updated&rdquo; date. If we make material changes, we will
          notify you by posting a notice or contacting you directly.
        </p>
      </section>

      <section id="contact">
        <h2>17. How can you contact us about this notice?</h2>
        <p>
          If you have questions or comments about this notice, email us at{" "}
          <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
        </p>
      </section>

      <section id="review">
        <h2>18. How can you review, update, or delete the data we collect from you?</h2>
        <p>
          Based on the laws of your country or state of residence, you may have the right to request access to the
          personal information we collect from you, details about how we&apos;ve processed it, correct inaccuracies,
          or delete your personal information. To make such a request, visit{" "}
          <a href="https://discoverzolo.com/contact">discoverzolo.com/contact</a>.
        </p>
      </section>

      <p className="text-xs text-foreground-subtle pt-4">
        This Privacy Policy was created with the help of Termly&apos;s Privacy Policy Generator.
      </p>
    </LegalPage>
  );
}

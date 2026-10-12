import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Clock, Briefcase } from "lucide-react";
import { JobApplicationForm } from "@/components/marketing/job-application-form";
import { brand } from "@/lib/config/brand";
import { canonical } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/content/page-seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";
import { WebPageJsonLd } from "@/components/shared/webpage-jsonld";

const SEO = PAGE_SEO.careers;

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  openGraph: { title: SEO.title, description: SEO.description },
  ...canonical(SEO.path),
};

const ROLE = "Growth & Marketing Specialist";

const RESPONSIBILITIES = [
  "Own top-of-funnel growth across paid social, content, and organic channels — from strategy through execution.",
  "Design and run experiments (creative, audience, channel, landing page) and report honestly on what worked.",
  "Build and manage referral and sharing loops that turn our most active users into our best acquisition channel.",
  "Partner with product to instrument and track the north-star loop: discover → try → return.",
  "Own our brand voice across social, email, and lifecycle marketing — adventurous, real, never corporate.",
  "Manage a monthly growth budget and report on CAC, retention, and channel ROI directly to the founders.",
];

const REQUIREMENTS = [
  "2-5 years in growth or performance marketing at a consumer app or DTC brand.",
  "Comfortable being hands-on: you'll write the ad copy, build the funnel, and read the dashboard yourself.",
  "A track record of finding a channel that worked before it was obvious, not just running the usual playbook.",
  "Sharp instincts for consumer brand and taste — you know what feels premium versus what feels like an ad.",
  "Data-literate: comfortable in analytics tools and able to reason about cohorts, retention, and CAC payback.",
  "Bonus: experience marketing to 20-something urban/young-professional audiences, or in travel/lifestyle apps.",
];

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <WebPageJsonLd path={SEO.path} name={SEO.title} description={SEO.description} dateModified={SEO.lastModified} />
      <BreadcrumbJsonLd items={[{ name: "Careers", path: "/careers" }]} />
      <p className="text-sm font-medium text-ember mb-3">Careers at {brand.name}</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-4">Join us early.</h1>
      <p className="text-lg text-foreground-muted mb-4 max-w-xl">
        We&apos;re a small team building the personalized discovery engine for real-world experiences. We&apos;re
        hiring for one role right now — if it&apos;s you, we&apos;d love to hear from you.
      </p>
      {/* Descriptive internal links (heycatch audit c_internal_links): this
          page used to link nowhere in its body, so a reader weighing the role
          had no route to what the company does or how to ask a question. */}
      <p className="text-sm text-foreground-muted mb-12 max-w-xl">
        Want context first? Read{" "}
        <Link href="/about" className="text-ember hover:underline">
          why {brand.name} exists
        </Link>
        , see{" "}
        <Link href="/pricing" className="text-ember hover:underline">
          how {brand.name} is priced
        </Link>
        , or{" "}
        <Link href="/contact" className="text-ember hover:underline">
          contact the team
        </Link>{" "}
        with questions before you apply.
      </p>

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-8 mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{ROLE}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-foreground-muted">
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> Full-time
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> Remote-friendly
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" /> Early-stage team
              </span>
            </div>
          </div>
        </div>

        <p className="text-foreground-muted leading-relaxed mb-6">
          {brand.name} is looking for our first dedicated growth hire — someone who can take a product people
          already love once they try it, and make sure a lot more people try it. You&apos;ll have real ownership
          over how we acquire and retain users, direct access to the founding team, and a genuine say in how the
          brand shows up in the world.
        </p>

        <h3 className="font-display text-lg font-semibold text-foreground mb-2">What you&apos;ll do</h3>
        <ul className="list-disc list-inside text-sm text-foreground-muted space-y-1.5 mb-6">
          {RESPONSIBILITIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <h3 className="font-display text-lg font-semibold text-foreground mb-2">What we&apos;re looking for</h3>
        <ul className="list-disc list-inside text-sm text-foreground-muted space-y-1.5">
          {REQUIREMENTS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <JobApplicationForm role={ROLE} />
    </div>
  );
}

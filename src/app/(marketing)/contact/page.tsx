import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { brand } from "@/lib/config/brand";
import { canonical } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/content/page-seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";
import { WebPageJsonLd } from "@/components/shared/webpage-jsonld";

const SEO = PAGE_SEO.contact;

export const metadata: Metadata = {
  title: { absolute: SEO.title },
  description: SEO.description,
  openGraph: { title: SEO.title, description: SEO.description },
  ...canonical(SEO.path),
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <WebPageJsonLd
        type="ContactPage"
        path={SEO.path}
        name={SEO.title}
        description={SEO.description}
        dateModified={SEO.lastModified}
      />
      <BreadcrumbJsonLd items={[{ name: "Contact", path: "/contact" }]} />
      <p className="text-sm font-medium text-ember mb-3">Get in touch</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-4">Contact us</h1>
      {/* Opens with a plain "X is Y" definition (heycatch audit g_definition):
          that's the form a search engine or AI assistant lifts verbatim, and
          the page previously opened with a bare question instead. */}
      <p className="text-lg text-foreground-muted mb-10 max-w-xl">
        {brand.name} is a personalized discovery platform that recommends things to do, with a reason for every
        pick. This page is how you reach the team: send questions, feedback, bug reports, or partnership inquiries
        with the form below, or email us directly at{" "}
        <a href={`mailto:${brand.supportEmail}`} className="text-ember hover:underline">
          {brand.supportEmail}
        </a>
        .
      </p>

      <ContactForm />
    </div>
  );
}

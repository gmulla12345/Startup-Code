import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { brand } from "@/lib/config/brand";
import { canonical } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";

export const metadata: Metadata = { title: "Contact", ...canonical("/contact") };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16">
      <BreadcrumbJsonLd items={[{ name: "Contact", path: "/contact" }]} />
      <p className="text-sm font-medium text-ember mb-3">Get in touch</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-4">Contact us</h1>
      <p className="text-lg text-foreground-muted mb-10 max-w-xl">
        Questions, feedback, or something not working right? Send us a message, or email us directly at{" "}
        <a href={`mailto:${brand.supportEmail}`} className="text-ember hover:underline">
          {brand.supportEmail}
        </a>
        .
      </p>

      <ContactForm />
    </div>
  );
}

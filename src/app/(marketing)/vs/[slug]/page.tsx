import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComparisonCellValue } from "@/components/marketing/comparison-cell";
import { brand } from "@/lib/config/brand";
import { VS_PAGES, getVsPage } from "@/lib/content/vs-pages";

export function generateStaticParams() {
  return VS_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/vs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = getVsPage(slug);
  if (!page) return { title: "Compare" };
  return {
    title: `${brand.name} vs ${page.competitor}`,
    description: `${page.tagline}. See how ${brand.name} compares to ${page.competitor} for finding things to do.`,
  };
}

export default async function VsPage({ params }: PageProps<"/vs/[slug]">) {
  const { slug } = await params;
  const page = getVsPage(slug);
  if (!page) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--forest-soft),transparent_60%)]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-14 text-center">
          <p className="text-sm font-medium text-ember mb-4">Compare</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground leading-tight">
            {brand.name} vs {page.competitor}
          </h1>
          <p className="mt-4 text-lg text-foreground-muted">{page.tagline}</p>
          <p className="mt-6 text-foreground-muted leading-relaxed max-w-2xl mx-auto">{page.intro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16 md:py-20 border-t border-border">
        <h2 className="font-display text-3xl font-semibold text-foreground text-center mb-10">
          {brand.name} vs {page.competitor} at a glance
        </h2>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th className="text-left font-medium text-foreground-muted px-5 py-3">Feature</th>
                <th className="text-center font-medium text-foreground px-5 py-3">{brand.name}</th>
                <th className="text-center font-medium text-foreground px-5 py-3">{page.competitor}</th>
              </tr>
            </thead>
            <tbody>
              {page.comparison.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-5 py-3.5 text-foreground-muted">{row.feature}</td>
                  <td className="px-5 py-3.5 text-center">
                    <ComparisonCellValue value={row.zolo} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <ComparisonCellValue value={row.competitor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 md:py-20 border-t border-border">
        <h2 className="font-display text-3xl font-semibold text-foreground text-center mb-10">
          Why people switch from {page.competitor}
        </h2>
        <div className="space-y-8">
          {page.whySwitch.map((item) => (
            <div key={item.title}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">{item.title}</h3>
              <p className="text-foreground-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16 md:py-20 border-t border-border">
        <h2 className="font-display text-3xl font-semibold text-foreground text-center mb-10">Questions</h2>
        <div className="space-y-3">
          {page.faq.map((item) => (
            <div key={item.q} className="rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4">
              <h3 className="font-medium text-foreground mb-1.5">{item.q}</h3>
              <p className="text-sm text-foreground-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-16 md:py-20 border-t border-border">
        <Button asChild size="lg">
          <Link href="/signup">
            Start Discovering <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { VS_PAGES } from "@/lib/content/vs-pages";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";

// The /vs pages answer the top objection this audience actually has
// ("how is this different from Google Maps or Tripadvisor?") but were only
// linked from the footer, where most visitors never scroll. Surfacing them
// here, right after How It Works, puts that answer where people are
// already asking the question.
export function ComparisonLinks() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Comparisons"
          title={`How ${brand.name} compares`}
          subtitle="Not sure how this is different from the apps you already use? Here's exactly how."
          className="mb-10"
        />
      </Reveal>

      <div className="grid sm:grid-cols-3 gap-5">
        {VS_PAGES.map((page, i) => (
          <Reveal key={page.slug} delay={i * 0.08}>
            <Link
              href={`/vs/${page.slug}`}
              className="group block h-full rounded-[var(--radius-lg)] border border-border bg-surface p-6 transition-all duration-300 hover:border-border-strong hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]"
            >
              <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wide mb-2">
                {brand.name} vs {page.competitor}
              </p>
              <p className="font-display text-lg font-semibold text-foreground mb-3">{page.tagline}</p>
              <span className="inline-flex items-center gap-1 text-sm text-ember font-medium">
                See the comparison
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

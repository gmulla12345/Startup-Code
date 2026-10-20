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
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="Comparisons"
          title={`How ${brand.name} compares`}
          subtitle="Not sure how this is different from the apps you already use? Here's exactly how."
          className="mb-12"
        />
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-3">
        {VS_PAGES.map((page, i) => (
          <Reveal key={page.slug} delay={i * 0.08}>
            <Link
              href={`/vs/${page.slug}`}
              className="group relative block h-full overflow-hidden rounded-3xl border border-border bg-surface p-7 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-raised)] active:scale-[0.98] active:duration-100"
            >
              {/* A hairline brand gradient along the top edge, revealed on hover. */}
              <span
                aria-hidden
                className="mk-gradient absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <p className="mb-3 text-xs font-semibold text-foreground-subtle">
                {brand.name} vs {page.competitor}
              </p>
              <p className="font-display text-xl font-semibold leading-snug tracking-tight text-foreground">{page.tagline}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary">
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

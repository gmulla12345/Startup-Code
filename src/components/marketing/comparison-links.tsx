import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { brand } from "@/lib/config/brand";
import { VS_PAGES } from "@/lib/content/vs-pages";

// The /vs pages answer the top objection this audience actually has
// ("how is this different from Google Maps or Tripadvisor?") but were only
// linked from the footer, where most visitors never scroll. Surfacing them
// here, right after How It Works, puts that answer where people are
// already asking the question.
export function ComparisonLinks() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
      <div className="max-w-2xl mb-10">
        <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground">How {brand.name} compares</h2>
        <p className="mt-4 text-foreground-muted text-lg">
          Not sure how this is different from the apps you already use? Here&apos;s exactly how.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        {VS_PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/vs/${page.slug}`}
            className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 hover:border-border-strong transition-colors"
          >
            <p className="text-xs font-medium text-foreground-subtle uppercase tracking-wide mb-2">
              {brand.name} vs {page.competitor}
            </p>
            <p className="font-display text-lg font-semibold text-foreground mb-3">{page.tagline}</p>
            <span className="inline-flex items-center gap-1 text-sm text-ember font-medium">
              See the comparison <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

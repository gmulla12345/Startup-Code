import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { getTravelProvider } from "@/services/providers";

// Soft corner washes, cycled across the tiles. Decorative only.
const WASHES = [
  "from-[#ffb199] to-[#ff4f93]",
  "from-[#ffd37a] to-[#ff8a5c]",
  "from-[#7be0c8] to-[#4cc9f0]",
  "from-[#b5a8ff] to-[#ff7ab6]",
  "from-[#8fd6ff] to-[#7be0c8]",
];

// The sitemap has always listed all 10 Travel Mode destination guides, but
// nothing on the homepage linked to them -- discoverable only via the sitemap
// itself (heycatch audit D2.4). Typographic tiles rather than city photos:
// the page no longer leans on stock imagery, and the links stay plain,
// descriptive text ("Paris France travel guide") for crawlers and screen
// readers alike.
export async function DestinationsSection() {
  const destinations = await getTravelProvider().listDestinations();
  if (destinations.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface-sunken">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Travel Mode"
            title="Plan your next trip, not just tonight"
            subtitle={`Dedicated guides and itineraries for ${destinations.length} destinations, with more being added regularly.`}
            className="mb-12"
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {destinations.map((dest, i) => (
            <Reveal key={dest.slug} delay={Math.min(i, 5) * 0.04}>
              <Link
                href={`/travel/${dest.slug}`}
                className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)] active:scale-[0.97] active:duration-100"
              >
                <span
                  aria-hidden
                  className={`absolute -right-7 -top-7 h-24 w-24 rounded-full bg-gradient-to-br opacity-60 blur-xl transition-opacity duration-300 group-hover:opacity-100 ${WASHES[i % WASHES.length]}`}
                />
                <ArrowUpRight
                  aria-hidden
                  className="relative ml-auto h-4 w-4 text-foreground-subtle transition-colors group-hover:text-primary"
                />
                <span className="relative block">
                  <span className="block font-display text-base font-semibold leading-tight text-foreground">{dest.city}</span>
                  <span className="block text-xs text-foreground-muted">
                    {dest.country}
                    <span className="sr-only"> travel guide</span>
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import Image from "next/image";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { getTravelProvider } from "@/services/providers";

// Downsizes the Unsplash cover photo for this section's small card size --
// `DESTINATIONS.coverImage` bakes in w=1600&h=900 (sized for the full
// /travel/[destination] banner), which would be a lot of wasted payload for
// a ~280px-wide card here.
function cardImage(url: string): string {
  return url.replace(/w=\d+&h=\d+/, "w=480&h=480");
}

// The sitemap has always listed all 10 Travel Mode destination guides, but
// nothing on the homepage ever linked to them -- discoverable only via the
// sitemap itself (heycatch audit D2.4). Placed between the /vs comparisons
// section and pricing, per the audit's own suggested placement.
export async function DestinationsSection() {
  const destinations = await getTravelProvider().listDestinations();
  if (destinations.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-background border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Travel Mode"
            title="Plan your next trip, not just tonight"
            subtitle={`Dedicated guides and itineraries for ${destinations.length} destinations, with more being added regularly.`}
            className="mb-10"
          />
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {destinations.map((dest, i) => (
            <Reveal key={dest.slug} delay={i * 0.04}>
              <Link
                href={`/travel/${dest.slug}`}
                className="group relative block aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-border"
              >
                <Image
                  src={cardImage(dest.coverImage)}
                  alt={`${dest.city}, ${dest.country}`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-display text-sm font-semibold text-white leading-tight">{dest.city}</p>
                  <p className="text-xs text-white/75">{dest.country}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

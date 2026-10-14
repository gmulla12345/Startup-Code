import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { brand } from "@/lib/config/brand";
import { OTHER_PAGE_LAST_MODIFIED, travelPageSeo } from "@/lib/content/page-seo";
import { WebPageJsonLd } from "@/components/shared/webpage-jsonld";
import { getTravelProvider, getExperienceProvider } from "@/services/providers";
import { usageContext } from "@/lib/usage/context";
import { ExperienceRail } from "@/components/home/experience-rail";
import { TripPlannerModal } from "@/components/trips/trip-planner-modal";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import type { DestinationInfo } from "@/services/providers/types";
import { canonical } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/shared/breadcrumb-jsonld";

export async function generateMetadata({ params }: PageProps<"/travel/[destination]">): Promise<Metadata> {
  const { destination } = await params;
  const dest = await getTravelProvider().getDestination(destination);
  if (!dest) return { title: "Destination" };
  const seo = travelPageSeo(dest);
  return {
    title: seo.title,
    description: seo.description,
    openGraph: { title: `${dest.city}, ${dest.country}`, description: seo.description, images: [dest.coverImage] },
    ...canonical(`/travel/${destination}`),
  };
}

export default async function TravelDestinationPage({ params }: PageProps<"/travel/[destination]">) {
  const { destination } = await params;
  const dest = await getTravelProvider().getDestination(destination);
  if (!dest) notFound();

  const supabase = await createClient();
  const user = await getCurrentUser();
  const subscription = user ? await getSubscription(supabase, user.id) : null;
  const userIsPremium = isPremium(subscription);

  const seo = travelPageSeo(dest);
  const otherDestinations = (await getTravelProvider().listDestinations()).filter((d) => d.slug !== dest.slug);

  return (
    <div>
      <WebPageJsonLd
        path={`/travel/${destination}`}
        name={`${seo.title} · ${brand.name}`}
        description={seo.description}
        dateModified={OTHER_PAGE_LAST_MODIFIED.travelGuides}
        about={{
          "@type": "TouristDestination",
          name: `${dest.city}, ${dest.country}`,
          description: dest.description,
          image: dest.coverImage,
          geo: { "@type": "GeoCoordinates", latitude: dest.latitude, longitude: dest.longitude },
        }}
      />
      <BreadcrumbJsonLd items={[{ name: dest.city, path: `/travel/${destination}` }]} />
      <div className="relative h-72 sm:h-96 w-full">
        <Image
          src={dest.coverImage}
          alt={dest.city}
          width={1600}
          height={900}
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-4 sm:left-8 text-white">
          <p className="text-sm text-white/80">Travel Mode</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold">{dest.city}</h1>
          <p className="text-white/80">{dest.country}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-2xl">
            {/* Opens with an "X is Y" definition of the page's subject (heycatch
                audit g_definition), built only from what the guide really is --
                nothing about the city itself that isn't already in the
                destination blurb below it. */}
            <p className="text-foreground-muted leading-relaxed">
              {brand.name}&apos;s {dest.city} travel guide is a personalized guide to things to do in {dest.city},{" "}
              {dest.country}: real places, hidden gems, and an AI-planned itinerary matched to your interests, budget,
              and travel dates.
            </p>
            <p className="text-foreground-muted leading-relaxed mt-3">{dest.description}</p>
            {dest.bestMonths.length > 0 && (
              <p className="text-sm text-foreground-subtle mt-2">Best time to visit: {dest.bestMonths.join(", ")}</p>
            )}
          </div>
          <TripPlannerModal
            destinationCity={dest.city}
            destinationCountry={dest.country}
            destinationLatitude={dest.latitude}
            destinationLongitude={dest.longitude}
            isPremium={userIsPremium}
          />
        </div>

        <Suspense fallback={<DestinationRailsSkeleton />}>
          <DestinationRails dest={dest} />
        </Suspense>

        {/* Static, server-rendered links (heycatch audit c_internal_links): the
            destination guides were only reachable from the homepage and the
            sitemap, and each guide linked to nothing else. Descriptive anchors
            ("Paris travel guide"), not "click here". */}
        <section aria-labelledby="more-guides" className="border-t border-border pt-8">
          <h2 id="more-guides" className="font-display text-xl font-semibold text-foreground mb-3">
            More Travel Mode destination guides
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {otherDestinations.map((d) => (
              <li key={d.slug}>
                <Link href={`/travel/${d.slug}`} className="text-ember hover:underline">
                  {d.city} travel guide
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-foreground-muted">
            Planning a trip? See{" "}
            <Link href="/faq" className="text-ember hover:underline">
              how Travel Mode works
            </Link>
            , or compare the{" "}
            <Link href="/pricing" className="text-ember hover:underline">
              Free and Premium plans
            </Link>{" "}
            — the AI Trip Planner is part of Premium.
          </p>
        </section>
      </div>
    </div>
  );
}

async function DestinationRails({ dest }: { dest: DestinationInfo }) {
  // A public guide page: not attributable to a user, but still logged.
  const provider = await getExperienceProvider(usageContext(null, "travel_guide"));
  const experiences = await provider.list({
    city: dest.city,
    latitude: dest.latitude,
    longitude: dest.longitude,
    radiusMiles: 25,
    limit: 40,
    // Fixed destination, identical for everyone: a day, not the hourly
    // default (10 guides x 7 Nearby Search calls each, crawled constantly).
    cacheSeconds: 60 * 60 * 24,
  });

  const toItems = (list: typeof experiences) => list.map((experience) => ({ experience }));
  const hiddenGems = experiences.filter((e) => e.isHiddenGem);
  const food = experiences.filter((e) => e.category === "food_drink");
  const outdoors = experiences.filter((e) => e.category === "outdoor_adventure");

  return (
    <div className="space-y-10">
      <ExperienceRail title="Things to do" items={toItems(experiences.slice(0, 10))} emptyMessage="No experiences catalogued yet for this destination." />
      <ExperienceRail title="Hidden gems" items={toItems(hiddenGems)} emptyMessage="" />
      <ExperienceRail title="Food & drink" items={toItems(food)} emptyMessage="" />
      <ExperienceRail title="Outdoor & adventure" items={toItems(outdoors)} emptyMessage="" />
    </div>
  );
}

function DestinationRailsSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 3 }).map((_, railIndex) => (
        <div key={railIndex} className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-64 shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

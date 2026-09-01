import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getTravelProvider, getExperienceProvider } from "@/services/providers";
import { ExperienceRail } from "@/components/home/experience-rail";
import { TripPlannerModal } from "@/components/trips/trip-planner-modal";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import type { DestinationInfo } from "@/services/providers/types";

export async function generateMetadata({ params }: PageProps<"/travel/[destination]">): Promise<Metadata> {
  const { destination } = await params;
  const dest = await getTravelProvider().getDestination(destination);
  if (!dest) return { title: "Destination" };
  return {
    title: `${dest.city} Travel Guide`,
    description: dest.description,
    openGraph: { title: `${dest.city}, ${dest.country}`, description: dest.description, images: [dest.coverImage] },
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

  return (
    <div>
      <div className="relative h-72 sm:h-96 w-full">
        <Image src={dest.coverImage} alt={dest.city} fill priority className="object-cover" />
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
            <p className="text-foreground-muted leading-relaxed">{dest.description}</p>
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
      </div>
    </div>
  );
}

async function DestinationRails({ dest }: { dest: DestinationInfo }) {
  const provider = await getExperienceProvider();
  const experiences = await provider.list({
    city: dest.city,
    latitude: dest.latitude,
    longitude: dest.longitude,
    radiusMiles: 25,
    limit: 40,
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

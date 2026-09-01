import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getExperienceProvider } from "@/services/providers";
import { DiscoveryMap } from "@/components/map/discovery-map";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils/format";

const DEFAULT_CENTER = { latitude: 39.2904, longitude: -76.6122 }; // Baltimore fallback

export default async function MapPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) redirect("/onboarding");

  const center =
    profile.latitude != null && profile.longitude != null
      ? { latitude: profile.latitude, longitude: profile.longitude }
      : DEFAULT_CENTER;

  return (
    <Suspense fallback={<MapContentSkeleton />}>
      <MapContent center={center} />
    </Suspense>
  );
}

async function MapContent({ center }: { center: { latitude: number; longitude: number } }) {
  const provider = await getExperienceProvider();
  const experiences = await provider.list({
    latitude: center.latitude,
    longitude: center.longitude,
    radiusMiles: 30,
    limit: 60,
  });

  return (
    <div className="flex flex-col md:flex-row md:gap-4 md:p-4">
      <div className="hidden md:block md:w-80 shrink-0 overflow-y-auto max-h-[calc(100vh-2rem)] space-y-3 pr-1">
        <h1 className="font-display text-xl font-semibold text-foreground px-1">Nearby</h1>
        {experiences.map((exp) => (
          <Link
            key={exp.id}
            href={`/experience/${exp.slug}`}
            className="flex gap-3 p-2 rounded-[var(--radius-md)] hover:bg-surface-sunken transition-colors"
          >
            <div className="relative h-16 w-16 rounded-[var(--radius-sm)] overflow-hidden bg-surface-sunken shrink-0">
              {exp.images[0] && <Image src={exp.images[0]} alt={exp.title} fill className="object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-1">{exp.title}</p>
              <p className="text-xs text-foreground-muted">{exp.city}</p>
              <p className="text-xs text-foreground-muted">{formatPrice(exp.priceEstimate, exp.priceLevel)}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex-1">
        <DiscoveryMap experiences={experiences} center={center} />
      </div>
    </div>
  );
}

function MapContentSkeleton() {
  return (
    <div className="flex flex-col md:flex-row md:gap-4 md:p-4">
      <div className="hidden md:block md:w-80 shrink-0 space-y-3 pr-1">
        <Skeleton className="h-6 w-24 mx-1" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2">
            <Skeleton className="h-16 w-16 shrink-0 rounded-[var(--radius-sm)]" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <Skeleton className="h-[60vh] md:h-[calc(100vh-2rem)] w-full rounded-none md:rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}

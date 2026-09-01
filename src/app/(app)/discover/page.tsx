import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { DiscoverGrid } from "@/components/discover/discover-grid";

// Falls back to New York when the visitor is logged out or hasn't set a
// location yet, so Discover has real (Google Places-sourced) results to
// show instead of coming back empty.
const DEFAULT_LOCATION = { latitude: 40.7128, longitude: -74.006 };

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const profile = user ? await getProfileByUserId(supabase, user.id) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Discover</h1>
      <p className="text-foreground-muted mb-6">Browse experiences, places, and events — personalized first.</p>
      <DiscoverGrid
        isAuthenticated={Boolean(user)}
        initialHiddenGemsOnly={params.hiddenGemsOnly === "true"}
        latitude={profile?.latitude ?? DEFAULT_LOCATION.latitude}
        longitude={profile?.longitude ?? DEFAULT_LOCATION.longitude}
      />
    </div>
  );
}

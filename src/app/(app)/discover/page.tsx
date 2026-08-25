import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { DiscoverGrid } from "@/components/discover/discover-grid";

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfileByUserId(supabase, user.id) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Discover</h1>
      <p className="text-foreground-muted mb-6">Browse experiences, places, and events — personalized first.</p>
      <DiscoverGrid
        isAuthenticated={Boolean(user)}
        initialHiddenGemsOnly={params.hiddenGemsOnly === "true"}
        latitude={profile?.latitude ?? null}
        longitude={profile?.longitude ?? null}
      />
    </div>
  );
}

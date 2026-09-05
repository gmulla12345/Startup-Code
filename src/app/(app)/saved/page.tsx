import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { listSaved } from "@/lib/repositories/saved";
import { getExperienceProvider } from "@/services/providers";
import { ExperienceCard } from "@/components/experience/experience-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Saved</h1>
      <p className="text-foreground-muted mb-8">Your collections of experiences, places, and trips.</p>

      {/*
       * Each saved item needs its own real-place lookup (a Google Places
       * Details call per item for Google-sourced saves) — Suspense-streamed
       * so the header above paints immediately instead of the whole page
       * waiting on however many saves someone has.
       */}
      <Suspense fallback={<SavedGridSkeleton />}>
        <SavedGrid userId={user.id} />
      </Suspense>
    </div>
  );
}

async function SavedGrid({ userId }: { userId: string }) {
  const supabase = await createClient();
  const saved = await listSaved(supabase, userId);
  const provider = await getExperienceProvider();

  const withExperiences = await Promise.all(
    saved.map(async (s) => ({ saved: s, experience: await provider.getById(s.experienceId) }))
  );
  const valid = withExperiences.filter((s) => s.experience);

  if (valid.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="h-14 w-14 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-4">
          <Compass className="h-6 w-6 text-foreground-subtle" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-1">No saved experiences yet</h2>
        <p className="text-foreground-muted mb-6">Let&apos;s find your first adventure.</p>
        <Button asChild size="lg">
          <Link href="/discover">Start Discovering</Link>
        </Button>
      </div>
    );
  }

  const collections = Array.from(new Set(valid.map((s) => s.saved.collection)));

  return (
    <div className="space-y-10">
      {collections.map((collection) => (
        <section key={collection}>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">{collection}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {valid
              .filter((s) => s.saved.collection === collection)
              .map((s) => (
                <ExperienceCard key={s.saved.id} experience={s.experience!} saved />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SavedGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full" />
      ))}
    </div>
  );
}

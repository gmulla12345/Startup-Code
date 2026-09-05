import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { listCompleted } from "@/lib/repositories/saved";
import { getExperienceProvider } from "@/services/providers";
import { ExperienceCard } from "@/components/experience/experience-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default async function CompletedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-foreground-muted mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to profile
      </Link>
      <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Completed</h1>
      <p className="text-foreground-muted mb-8">Experiences you&apos;ve marked as done.</p>

      {/*
       * Same reasoning as saved/page.tsx: each item needs its own real-place
       * lookup, so this is Suspense-streamed to keep the header instant.
       */}
      <Suspense fallback={<CompletedGridSkeleton />}>
        <CompletedGrid userId={user.id} />
      </Suspense>
    </div>
  );
}

async function CompletedGrid({ userId }: { userId: string }) {
  const supabase = await createClient();
  const completed = await listCompleted(supabase, userId);
  const provider = await getExperienceProvider();

  const withExperiences = await Promise.all(
    completed.map(async (c) => ({ completed: c, experience: await provider.getById(c.experienceId) }))
  );
  const valid = withExperiences.filter((c) => c.experience);

  if (valid.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="h-14 w-14 rounded-full bg-surface-sunken flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-6 w-6 text-foreground-subtle" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-1">Nothing marked as completed yet</h2>
        <p className="text-foreground-muted mb-6">
          Open an experience and tap the checkmark once you&apos;ve done it.
        </p>
        <Button asChild size="lg">
          <Link href="/discover">Start Discovering</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {valid.map((c) => (
        <ExperienceCard key={c.completed.id} experience={c.experience!} completed />
      ))}
    </div>
  );
}

function CompletedGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full" />
      ))}
    </div>
  );
}

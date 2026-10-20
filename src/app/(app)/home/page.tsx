import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { noindexMetadata } from "@/lib/seo";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { usageContext } from "@/lib/usage/context";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getRecommendations } from "@/services/recommendation/engine";
import { SurpriseMeButton } from "@/components/home/surprise-me-button";
import { ListSection } from "@/components/lists/list-section";
import { buildHomeLists } from "@/lib/lists/build";
import { loadHouseHomeLists } from "@/lib/lists/house";
import { Skeleton } from "@/components/ui/skeleton";
import type { Profile } from "@/types/database";

export const metadata = noindexMetadata;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile) redirect("/onboarding");

  return (
    <div className="glow-page">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <div>
        <p className="text-foreground-muted">{greeting()}, {profile.firstName || "there"}.</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-foreground mt-1">
          What should you do <span className="mk-gradient-text">today</span>?
        </h1>
      </div>

      <SurpriseMeButton />

      {/*
       * The lists below need recommendations (a Google Places fetch, and the scoring
       * that ranks them) — that chain alone can take seconds. Streaming it behind
       * Suspense means the greeting and Surprise Me button paint immediately on every
       * navigation to Home instead of the whole page waiting on the slowest data source.
       */}
      <Suspense fallback={<ListsSkeleton />}>
        <HomeLists profile={profile} />
      </Suspense>
    </div>
    </div>
  );
}

async function HomeLists({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  // useAI: false — the AI reasoning call is a non-streamed request that has
  // to finish generating its entire batch before anything comes back
  // (measured directly against the API: ~10s for 10 candidates), and it sat
  // on Home's critical path even behind Suspense, since the whole section
  // waits on this one call. Measured live on a fresh, uncached location: 8.8s
  // before content appeared. Now that scoreExperience's deterministic reasons
  // are grounded in real derived tags (see the taste-learning fix), a list's
  // plain "why this pick" line (lib/lists/reasons.ts) is accurate and
  // specific, not worth a multi-second wait on every login.
  //
  // One request, many lists: every list below is a rule over these same ranked
  // places (lib/lists/templates.ts), so adding lists adds no Google or AI cost.
  // This week's lists (ones we wrote, open today) come first; they do not wait on the recommendations, nor the reverse.
  const [recommendations, houseLists] = await Promise.all([
    getRecommendations(supabase, profile, {
      surfaceContext: "for_you",
      limit: 24,
      useAI: false,
      usage: usageContext(profile.userId, "home"),
    }),
    loadHouseHomeLists(profile),
  ]);

  const lists = [...houseLists, ...buildHomeLists(recommendations, profile)];

  if (lists.length === 0) {
    const hasLocation = profile.latitude != null && profile.longitude != null;
    return (
      <p className="text-foreground-muted">
        {hasLocation
          ? /* COPY: shown when no list could be made */ "Your lists are not ready just now. Try again in a little while."
          : /* COPY: shown when the person has not set a location */ "Add your location in your profile, and your lists will appear here."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {lists.map((list) => (
        <ListSection key={list.key} list={list} showMatch={list.template === "for-you"} />
      ))}

      {/* COPY: the quiet way to the planners, now that lists come first */}
      <p className="pt-2 text-sm text-foreground-muted">
        Planning further ahead?{" "}
        <Link href="/trips" className="text-primary hover:underline">
          Open your trips
        </Link>
        .
      </p>
    </div>
  );
}

function ListsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, listIndex) => (
        <div key={listIndex} className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-20 w-20 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

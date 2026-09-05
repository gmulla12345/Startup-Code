import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/repositories/profile";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { AppShell } from "@/components/layout/app-shell";
import { PublicHeader } from "@/components/layout/public-header";

/**
 * Shared shell for /home, /discover, /map, /trips, /saved, /profile
 * (authenticated, sidebar + bottom nav) as well as the public
 * /experience/[slug] and /travel/[destination] pages (no auth required —
 * rendered with a lightweight public header instead).
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <PublicHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.onboardingCompleted) {
    redirect("/onboarding");
  }

  const subscription = await getSubscription(supabase, user.id);

  return (
    <AppShell profile={profile} email={user.email ?? null} premium={isPremium(subscription)}>
      {children}
    </AppShell>
  );
}

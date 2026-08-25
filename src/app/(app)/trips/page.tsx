import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, isPremium } from "@/lib/repositories/subscriptions";
import { listItineraries } from "@/lib/repositories/itineraries";
import { getTravelProvider } from "@/services/providers";
import { WeekendPlanner } from "@/components/trips/weekend-planner";
import { TravelModeSearch } from "@/components/trips/travel-mode-search";

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [subscription, itineraries, destinations] = await Promise.all([
    getSubscription(supabase, user.id),
    listItineraries(supabase, user.id),
    getTravelProvider().listDestinations(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Trips</h1>
      <p className="text-foreground-muted mb-8">Plan your weekend, or explore a destination for your next trip.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <WeekendPlanner isPremium={isPremium(subscription)} />
        <TravelModeSearch destinations={destinations} />
      </div>

      {itineraries.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">Your plans</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {itineraries.map((it) => (
              <Link
                key={it.id}
                href={`/trips/${it.id}`}
                className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-border bg-surface hover:shadow-[var(--shadow-card)] transition-shadow"
              >
                <div className="h-10 w-10 rounded-full bg-[var(--forest-soft)] flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-forest" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{it.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {it.estimatedCost ? `~$${it.estimatedCost}` : "Cost varies"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Explore destinations</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {destinations.map((dest) => (
            <Link
              key={dest.slug}
              href={`/travel/${dest.slug}`}
              className="relative aspect-[4/3] rounded-[var(--radius-lg)] overflow-hidden group"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-105"
                style={{ backgroundImage: `url(${dest.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="font-display font-semibold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {dest.city}
                </p>
                <p className="text-xs text-white/80">{dest.country}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

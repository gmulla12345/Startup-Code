import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getItineraryWithItems } from "@/lib/repositories/itineraries";
import { ItineraryDetail } from "@/components/trips/itinerary-detail";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

export default async function SharedItineraryPage({ params }: PageProps<"/share/itinerary/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const result = await getItineraryWithItems(supabase, id);
  if (!result || !result.itinerary.isPublic) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-5 flex items-center justify-between">
        <Logo />
        <Button asChild size="sm">
          <Link href="/signup">Plan your own</Link>
        </Button>
      </header>
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <ItineraryDetail itinerary={result.itinerary} items={result.items} />
      </main>
    </div>
  );
}

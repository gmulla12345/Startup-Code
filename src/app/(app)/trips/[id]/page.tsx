import { notFound, redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getItineraryWithItems } from "@/lib/repositories/itineraries";
import { ItineraryDetail } from "@/components/trips/itinerary-detail";
import { ShareItineraryButton } from "@/components/trips/share-itinerary-button";

export default async function ItineraryPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await getItineraryWithItems(supabase, id);
  if (!result || result.itinerary.userId !== user.id) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div />
        <ShareItineraryButton itineraryId={result.itinerary.id} shareSlug={result.itinerary.shareSlug} />
      </div>
      <ItineraryDetail itinerary={result.itinerary} items={result.items} />
    </div>
  );
}

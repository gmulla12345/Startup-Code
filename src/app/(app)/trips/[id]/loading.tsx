import { Skeleton } from "@/components/ui/skeleton";

export default function ItineraryLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

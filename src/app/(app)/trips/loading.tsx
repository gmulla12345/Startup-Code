import { Skeleton } from "@/components/ui/skeleton";

export default function TripsLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-9 w-24 mb-2" />
      <Skeleton className="h-5 w-96 max-w-full mb-8" />

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>

      <Skeleton className="h-6 w-40 mb-4" />
      <div className="grid sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full" />
        ))}
      </div>
    </div>
  );
}

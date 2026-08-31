import { Skeleton } from "@/components/ui/skeleton";

export default function TravelDestinationLoading() {
  return (
    <div>
      <Skeleton className="h-72 sm:h-96 w-full rounded-none" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-2xl w-full space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-11 w-48 shrink-0" />
        </div>

        {Array.from({ length: 3 }).map((_, railIndex) => (
          <div key={railIndex} className="space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-64 shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

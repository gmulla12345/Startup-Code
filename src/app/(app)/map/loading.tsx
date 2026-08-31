import { Skeleton } from "@/components/ui/skeleton";

export default function MapLoading() {
  return (
    <div className="flex flex-col md:flex-row md:gap-4 md:p-4">
      <div className="hidden md:block md:w-80 shrink-0 space-y-3 pr-1">
        <Skeleton className="h-6 w-24 mx-1" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2">
            <Skeleton className="h-16 w-16 shrink-0 rounded-[var(--radius-sm)]" />
            <div className="flex-1 space-y-1.5 pt-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <Skeleton className="h-[60vh] md:h-[calc(100vh-2rem)] w-full rounded-none md:rounded-[var(--radius-lg)]" />
      </div>
    </div>
  );
}

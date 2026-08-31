import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-72" />
      </div>

      <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />

      <div className="space-y-10">
        {Array.from({ length: 3 }).map((_, railIndex) => (
          <div key={railIndex} className="space-y-4">
            <Skeleton className="h-6 w-40" />
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

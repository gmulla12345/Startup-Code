import { Skeleton } from "@/components/ui/skeleton";

export default function ExperienceDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="aspect-[16/10] w-full" />

      <div className="mt-6 flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <Skeleton className="h-9 w-2/3 mt-3" />

      <div className="flex gap-4 mt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="h-12 w-full mt-6 rounded-[var(--radius-lg)]" />

      <div className="mt-8 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

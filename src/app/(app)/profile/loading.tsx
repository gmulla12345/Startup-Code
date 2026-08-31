import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>

      <Skeleton className="h-32 w-full mb-8" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

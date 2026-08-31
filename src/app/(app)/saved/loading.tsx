import { Skeleton } from "@/components/ui/skeleton";

export default function SavedLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-5 w-80 max-w-full mb-8" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full" />
        ))}
      </div>
    </div>
  );
}

import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Review } from "@/types/database";

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-foreground-muted">No reviews yet — be the first to try this one.</p>;
  }

  return (
    <div className="space-y-5">
      {reviews.map((review) => (
        <div key={review.id} className="flex gap-3">
          <Avatar name={review.authorName} size={36} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{review.authorName}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i < review.rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-border-strong"}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-foreground-muted mt-1">{review.comment}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

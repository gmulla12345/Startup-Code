import type { Itinerary, ItineraryItem } from "@/types/database";

const DAY_LABELS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

export function ItineraryDetail({ itinerary, items }: { itinerary: Itinerary; items: ItineraryItem[] }) {
  const byDay = new Map<number, ItineraryItem[]>();
  for (const item of items) {
    if (!byDay.has(item.dayIndex)) byDay.set(item.dayIndex, []);
    byDay.get(item.dayIndex)!.push(item);
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-foreground mb-1">{itinerary.title}</h1>
      {itinerary.estimatedCost != null && (
        <p className="text-foreground-muted mb-8">Estimated cost: ${itinerary.estimatedCost}</p>
      )}

      <div className="space-y-10">
        {Array.from(byDay.entries()).map(([dayIndex, dayItems]) => (
          <div key={dayIndex}>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              {DAY_LABELS[dayIndex] ?? `Day ${dayIndex + 1}`}
            </h2>
            <div className="space-y-4">
              {dayItems
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <span className="text-sm font-medium text-foreground-muted w-16 shrink-0">{item.startTime}</span>
                    <div className="flex-1 border-l-2 border-border pl-4 pb-2">
                      <p className="font-medium text-foreground">{item.title}</p>
                      {item.notes && <p className="text-sm text-foreground-muted mt-0.5">{item.notes}</p>}
                      {item.estimatedCost != null && item.estimatedCost > 0 && (
                        <p className="text-xs text-foreground-subtle mt-0.5">${item.estimatedCost}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

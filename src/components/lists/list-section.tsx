import { ListPlaceRow } from "@/components/lists/list-place-row";
import { ShareListButton } from "@/components/lists/share-list-button";
import type { HomeList } from "@/lib/lists/build";
import { formatDistance } from "@/lib/utils/format";

/**
 * One list on Home: a title, one line of copy, and its places in order, each with the
 * reason it is there. The share button appears only when the list can become a public
 * link (every place is a real Google place and there are enough of them).
 */
export function ListSection({ list, showMatch = false }: { list: HomeList; showMatch?: boolean }) {
  return (
    <section aria-labelledby={`list-${list.key}`} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`list-${list.key}`} className="font-display text-xl font-semibold text-foreground">
            {list.title}
          </h2>
          <p className="mt-0.5 text-sm text-foreground-muted">{list.blurb}</p>
          {list.through && <p className="mt-1 text-xs text-foreground-subtle">{list.through}</p>}
        </div>
        {list.template !== "house" && list.shareIds.length > 0 && <ShareListButton template={list.template} placeIds={list.shareIds} title={list.title} />}
      </div>

      <ol className="mt-3 divide-y divide-border">
        {list.places.map((p, i) => (
          <ListPlaceRow
            key={p.experience.id}
            experience={p.experience}
            index={i}
            why={p.why}
            distanceLabel={p.distanceMiles != null ? formatDistance(p.distanceMiles) : undefined}
            matchScore={showMatch ? p.matchScore : undefined}
          />
        ))}
      </ol>
    </section>
  );
}

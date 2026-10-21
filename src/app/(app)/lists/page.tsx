import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { OwnListCard } from "@/components/lists/own-list-card";
import { brand } from "@/lib/config/brand";
import { LIST_MIN_PLACES, listPath } from "@/lib/config/lists";
import { listOwnLists } from "@/lib/lists/own";
import { noindexMetadata } from "@/lib/seo";

export const metadata = noindexMetadata;

/**
 * Lists you have made yourself, from places you have saved. Each is private to you until you choose to give it a link.
 * (The lists made for you on Home are Zolo's own and are not here.)
 */
export default async function YourListsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [lists, { count: savedCount }] = await Promise.all([
    listOwnLists(user.id),
    supabase.from("saved_experiences").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const canMake = (savedCount ?? 0) >= LIST_MIN_PLACES;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* COPY: the heading and line on the page of your own lists */}
          <h1 className="font-display text-3xl font-semibold text-foreground">Your lists</h1>
          <p className="mt-1 text-foreground-muted">Lists of places you have saved. Private until you choose to share one.</p>
        </div>
        {canMake && (
          <Button asChild size="sm" className="shrink-0">
            <Link href="/lists/new">New list</Link>
          </Button>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="mt-10 rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center">
          {/* COPY: shown when you have no lists of your own yet */}
          <p className="font-display text-lg font-semibold text-foreground">No lists yet.</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {canMake ? "Make one from the places you have saved." : `Save at least ${LIST_MIN_PLACES === 3 ? "three" : LIST_MIN_PLACES} places, then make a list from them.`}
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href={canMake ? "/lists/new" : "/discover"}>{canMake ? "Make a list" : "Find places to save"}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {lists.map((l) => (
            <OwnListCard
              key={l.id}
              list={{
                id: l.id,
                title: l.title,
                blurb: l.blurb,
                count: l.placeIds.length,
                isPublic: l.isPublic,
                showName: l.showName,
                url: l.isPublic ? `${brand.domain}${listPath(l.token)}` : null,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

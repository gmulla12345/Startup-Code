import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { ShareViewBeacon } from "@/components/share/share-view-beacon";
import { brand } from "@/lib/config/brand";
import { LIST_SRC, listPath } from "@/lib/config/lists";
import { photoProxyUrl } from "@/lib/google/photo-url";
import { canonical } from "@/lib/seo";
import { getPublicList } from "@/lib/lists/store";
import { loadListView, type ListViewItem } from "@/lib/lists/view";

/**
 * The public page for a shared list: a title, one line of copy, and the places on it,
 * for anyone who has the link.
 *
 * Built once and reused for an hour, so a link that goes round a campus costs almost
 * nothing: the next visitors are served the finished page, and Google is asked about a
 * place at most about once an hour however many people open it. The cache is dropped
 * the moment the sharer turns the list off or changes it (tag expiry, see api/lists).
 * `revalidate` must be a literal for Next to read it; a test keeps it equal to
 * LIST_CACHE_SECONDS.
 *
 * Private by default, like a share link: not indexed by search engines (link previews
 * in messaging apps still work, they do not obey noindex), no name of the sharer, no
 * dates, no coordinates, no account ids. A list that was turned off and one that never
 * existed are the same 404.
 */
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  // Only our own words are needed for the title and the preview, so no Google call is made here.
  const list = await getPublicList(token);
  if (!list) return { title: "Link not found", robots: { index: false, follow: false } };

  // COPY: the description a link preview shows under a shared list's title
  const description = `${list.placeIds.length} places to try, chosen with ${brand.name}.`;
  return {
    title: list.title,
    description,
    robots: { index: false, follow: false },
    ...canonical(listPath(token)),
    openGraph: { title: list.title, description, type: "website", siteName: brand.name, url: `${brand.domain}${listPath(token)}` },
    // Replaces the site-wide card, so the preview image is this page's own (opengraph-image).
    twitter: { card: "summary_large_image", title: list.title, description },
  };
}

function Credit({ credit }: { credit: { name: string; url: string | null } }) {
  return (
    <span className="mt-1 block text-[11px] text-foreground-subtle">
      Photo:{" "}
      {credit.url ? (
        <a href={credit.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
          {credit.name}
        </a>
      ) : (
        credit.name
      )}
    </span>
  );
}

function Row({ item, index }: { item: ListViewItem; index: number }) {
  if (item.place.status !== "ok") return null;
  const { place } = item.place;
  const meta = [place.category, place.address].filter(Boolean).join(" · ");

  return (
    <li className="flex items-start gap-4 py-4">
      <span className="font-reason w-5 shrink-0 pt-0.5 text-xl text-foreground-subtle">{index + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-lg font-semibold leading-snug text-foreground">{place.name}</span>
        {meta && <span className="mt-0.5 block text-sm text-foreground-muted">{meta}</span>}
        {place.photoCredit && <Credit credit={place.photoCredit} />}
      </span>
      {place.photoRef && (
        // The photo goes through our own proxy (never straight to Google), so the visitor's
        // address is not sent to Google and the API key stays server-side.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoProxyUrl(place.photoRef, 300)}
          alt={place.name}
          className="h-20 w-20 shrink-0 rounded-[var(--radius-md)] bg-surface-sunken object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </li>
  );
}

export default async function SharedListPage({ params }: Props) {
  const { token } = await params;
  const view = await loadListView(token);
  if (!view) notFound();

  const shown = view.items.filter((i) => i.place.status === "ok");

  return (
    // data-own-google-attribution: this page prints its own Google credit, so the floating site-wide badge steps aside (globals.css).
    <div data-own-google-attribution className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <Link href="/login" className="text-sm text-foreground-muted underline-offset-4 hover:text-foreground hover:underline">
          Log in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-4 sm:px-6">
        <article className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {/* COPY: the small line above a shared list's title */}
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-subtle">A list, shared with you</p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{view.title}</h1>
          {view.blurb && <p className="mt-2 text-foreground-muted">{view.blurb}</p>}

          {shown.length > 0 ? (
            <ol className="mt-6 divide-y divide-border border-y border-border">
              {shown.map((item, i) => (
                <Row key={item.placeId} item={item} index={i} />
              ))}
            </ol>
          ) : (
            // COPY: shown when none of a shared list's places could be loaded
            <p className="mt-6 text-foreground-muted">We could not load the places on this list just now. Try again in a little while.</p>
          )}

          <p className="mt-6 text-xs text-foreground-subtle">Powered by Google</p>
        </article>

        <div className="mt-8 text-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            {/* Carries where the visitor came from, so signups can be traced to shared lists. */}
            {/* COPY: the button under a shared list */}
            <Link href={`/signup?src=${LIST_SRC}`}>Make your own with {brand.name}</Link>
          </Button>
        </div>
      </main>

      <ShareViewBeacon kind="list" />
    </div>
  );
}

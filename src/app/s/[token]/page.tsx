import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { ShareViewBeacon } from "@/components/share/share-view-beacon";
import { brand } from "@/lib/config/brand";
import { SHARE_SRC, sharePath } from "@/lib/config/share";
import { photoProxyUrl } from "@/lib/google/photo-url";
import { canonical } from "@/lib/seo";
import { describeShare } from "@/lib/share/copy";
import { loadShareView, type ShareView } from "@/lib/share/view";

/**
 * The public page for a shared place or plan: what the sharer chose to share and
 * nothing else, for anyone who has the link.
 *
 * Built once and reused for an hour, so a link that goes round a campus costs
 * almost nothing: the next visitors are served the finished page, and Google is
 * asked about a place at most about once an hour however many people open it. The
 * cache is dropped the moment the sharer turns the link off or changes it (tag
 * expiry, see api/shares). `revalidate` must be a literal for Next to read it; a
 * test keeps it equal to SHARE_CACHE_SECONDS.
 *
 * Private by default: not indexed by search engines (link previews in messaging
 * apps still work, they do not obey noindex), no sharer name unless they ticked
 * the box, no dates, no coordinates, no account ids. A link that was turned off and
 * one that never existed are the same 404.
 */
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const view = await loadShareView(token);
  if (!view) return { title: "Link not found", robots: { index: false, follow: false } };

  const copy = describeShare(view);
  return {
    title: copy.title,
    description: copy.description,
    robots: { index: false, follow: false },
    ...canonical(sharePath(token)),
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "website",
      siteName: brand.name,
      url: `${brand.domain}${sharePath(token)}`,
    },
    // Replaces the site-wide card, so the preview image is this page's own (opengraph-image).
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description },
  };
}

function Attribution({ credit }: { credit?: { name: string; url: string | null } | null }) {
  return (
    <p className="mt-6 text-xs text-foreground-subtle">
      Powered by Google
      {credit && (
        <>
          {" "}
          · Photo:{" "}
          {credit.url ? (
            <a href={credit.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
              {credit.name}
            </a>
          ) : (
            credit.name
          )}
        </>
      )}
    </p>
  );
}

function Note({ view }: { view: ShareView }) {
  if (!view.note) return null;
  return (
    <figure className="mt-6 border-l-2 border-primary pl-4">
      <blockquote className="text-lg leading-relaxed text-foreground">{`“${view.note}”`}</blockquote>
      {view.sharerName && <figcaption className="mt-2 text-sm text-foreground-muted">{view.sharerName}</figcaption>}
    </figure>
  );
}

function PlaceBody({ view }: { view: Extract<ShareView, { kind: "place" }> }) {
  const result = view.place;
  const place = result.status === "ok" ? result.place : null;

  return (
    <>
      {place?.photoRef && (
        // The photo goes through our own proxy (never straight to Google), so the
        // visitor's address is not sent to Google and the API key stays server-side.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoProxyUrl(place.photoRef, 1200)}
          alt={place.name}
          className="aspect-[16/10] w-full bg-surface-sunken object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-subtle">A place, shared with you</p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {place?.name ?? "A place shared with you"}
        </h1>
        {place ? (
          <p className="mt-2 text-foreground-muted">{[place.category, place.address].filter(Boolean).join(" · ")}</p>
        ) : (
          <p className="mt-2 text-foreground-muted">
            {result.status === "not_found"
              ? "This place is no longer listed."
              : "We could not load the details for this place just now."}
          </p>
        )}
        <Note view={view} />
        <Attribution credit={place?.photoCredit} />
      </div>
    </>
  );
}

function PlanBody({ view }: { view: Extract<ShareView, { kind: "plan" }> }) {
  const { plan } = view;
  const copy = describeShare(view);

  return (
    <div className="p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground-subtle">A plan, shared with you</p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{plan.title}</h1>
      <p className="mt-2 text-foreground-muted">
        {copy.detail}
        {plan.estimatedCost ? ` · Estimated cost about $${Math.round(plan.estimatedCost)}` : ""}
      </p>
      <Note view={view} />

      <div className="mt-8 space-y-8">
        {plan.days.map((day) => (
          <section key={day.label}>
            <h2 className="text-sm font-medium text-foreground">{day.label}</h2>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {day.stops.map((stop, i) => (
                <li key={`${day.label}-${i}`} className="flex gap-4 py-3">
                  <span className="w-16 shrink-0 text-sm tabular-nums text-foreground-subtle">{stop.time}</span>
                  <span>
                    <span className="block text-foreground">{stop.title}</span>
                    {stop.note && <span className="mt-1 block text-sm text-foreground-muted">{stop.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {plan.truncated && <p className="mt-4 text-sm text-foreground-muted">Showing the first stops of a longer plan.</p>}
      <Attribution />
    </div>
  );
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const view = await loadShareView(token);
  if (!view) notFound();

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
        <article className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-card)]">
          {view.kind === "place" ? <PlaceBody view={view} /> : <PlanBody view={view} />}
        </article>

        <div className="mt-8 text-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            {/* Carries where the visitor came from, so signups can be traced to shared links. */}
            <Link href={`/signup?src=${SHARE_SRC[view.kind]}`}>Plan your own with {brand.name}</Link>
          </Button>
        </div>
      </main>

      <ShareViewBeacon kind={view.kind} />
    </div>
  );
}

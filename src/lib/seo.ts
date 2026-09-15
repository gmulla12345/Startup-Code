import type { Metadata } from "next";
import { brand } from "@/lib/config/brand";

/**
 * Every indexable page needs an explicit self-referencing canonical tag —
 * without one, Google can index discoverzolo.com, discoverzolo.com/, and
 * https://discoverzolo.com as separate duplicate URLs, diluting ranking
 * signal. `path` is root-relative and must start with "/" (e.g. "/pricing").
 *
 * Also clears any inherited canonical: a leaf page's `generateMetadata`
 * that doesn't set `alternates` at all inherits the root layout's
 * `alternates.canonical: "/"` instead — which silently pointed every page
 * missing this call (e.g. experience detail pages, the 404 page) at the
 * homepage. Always spread this in rather than relying on the default.
 */
export function canonical(path: string): { alternates: { canonical: string } } {
  return { alternates: { canonical: `${brand.domain}${path}` } };
}

/**
 * For pages that should never be indexed (thin/duplicate content, or
 * private authenticated screens) but are still fine for Google to crawl and
 * follow links through — prefer this over a robots.txt Disallow, which
 * blocks crawling entirely and so can prevent Google from ever seeing (and
 * acting on) the noindex tag on a URL it already knows about.
 */
export const noindexMetadata: Metadata = { robots: { index: false, follow: true } };

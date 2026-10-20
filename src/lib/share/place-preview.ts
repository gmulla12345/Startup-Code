import { fetchGoogleJson } from "@/lib/google/places-fetch";
import { PHOTO_REF_PATTERN } from "@/lib/google/photo-url";
import { SHARE_CACHE_SECONDS } from "@/lib/config/share";
import { titleCase } from "@/lib/utils/format";
import { usageContext } from "@/lib/usage/context";

/**
 * The live half of a shared place: what Google says about it right now, fetched
 * when the page is built, never stored. Only the place_id is ours to keep (it is
 * what a share link stores); the name, address, type and photo below exist only in
 * the built page, which is reused for at most SHARE_CACHE_SECONDS.
 *
 * Deliberately lean: a Place Details request for name, address, type and photos
 * only. No rating, reviews, hours, phone or website. That is the cheaper request,
 * and it keeps the page to the least Google content that still says what the place is.
 *
 * Google's display rules for what is shown: the page prints "Powered by Google"
 * beside it, and the photo is shown with its author's credit (html_attributions),
 * parsed here into plain text and an optional link to the author's Google profile.
 */

interface GoogleDetailsResult {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  types?: string[];
  photos?: { photo_reference?: string; html_attributions?: string[] }[];
}

export interface PhotoCredit {
  name: string;
  /** The author's Google Maps profile, when Google gave one we can safely link to. */
  url: string | null;
}

export interface PlacePreview {
  name: string;
  address: string | null;
  /** A short label such as "Cafe" or "Museum"; null when Google's types say nothing useful. */
  category: string | null;
  photoRef: string | null;
  photoCredit: PhotoCredit | null;
}

/** Google's generic types: true of nearly every place, so they say nothing. */
const GENERIC_TYPES = new Set([
  "point_of_interest",
  "establishment",
  "premise",
  "political",
  "locality",
  "route",
  "street_address",
  "food",
  "store",
]);

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/**
 * Google sends a photo's author as a small piece of HTML, usually
 * <a href="https://maps.google.com/maps/contrib/123">Name</a>. We never insert that
 * HTML: the name is kept as plain text, and the link only if it points at Google Maps.
 */
export function parsePhotoCredit(html: unknown): PhotoCredit | null {
  if (typeof html !== "string") return null;
  const match = html.match(/^\s*<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*$/i);
  const rawName = match ? match[2] : html;
  const name = decodeEntities(rawName.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim().slice(0, 80);
  if (!name) return null;

  let url: string | null = null;
  if (match) {
    const href = decodeEntities(match[1]).trim();
    const absolute = href.startsWith("//") ? `https:${href}` : href;
    if (/^https:\/\/(?:www\.)?(?:maps\.google\.com|google\.com\/maps)\//.test(absolute)) url = absolute;
  }
  return { name, url };
}

/** Maps Google's answer to what a share page shows, or null if it has no usable name. */
export function toPlacePreview(result: GoogleDetailsResult | undefined): PlacePreview | null {
  const name = typeof result?.name === "string" ? result.name.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  if (!name) return null;

  const address =
    typeof result?.formatted_address === "string" && result.formatted_address.trim()
      ? result.formatted_address.replace(/\s+/g, " ").trim().slice(0, 200)
      : null;

  const type = (result?.types ?? []).find((t) => typeof t === "string" && !GENERIC_TYPES.has(t));
  const category = type ? titleCase(type) : null;

  const photo = (result?.photos ?? []).find((p) => typeof p.photo_reference === "string" && PHOTO_REF_PATTERN.test(p.photo_reference));
  return {
    name,
    address,
    category,
    photoRef: photo?.photo_reference ?? null,
    photoCredit: photo ? parsePhotoCredit(photo.html_attributions?.[0]) : null,
  };
}

export type PlacePreviewResult =
  | { status: "ok"; place: PlacePreview }
  /** Google does not know this place id (any more). */
  | { status: "not_found" }
  /** Google could not be asked: no key, billing, an outage, or today's ceiling for shared links. */
  | { status: "unavailable" };

/**
 * One Place Details request, through the same door as every other Google call
 * (lib/google/places-fetch.ts): cached for SHARE_CACHE_SECONDS by place id (so
 * every share of the same place, and every viewer, shares one call), counted
 * against the anonymous daily ceiling for shared-link previews, and logged.
 */
export async function fetchPlacePreview(placeId: string, feature: "share_preview" | "list_preview" = "share_preview"): Promise<PlacePreviewResult> {
  const key = process.env.MAPS_API_KEY;
  if (!key) return { status: "unavailable" };

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "place_id,name,formatted_address,types,photos");
  url.searchParams.set("key", key);

  const result = await fetchGoogleJson<{ status: string; result?: GoogleDetailsResult }>({
    operation: "place_details_share",
    url: url.toString(),
    // "v1" is the field list above: bump it if the fields change.
    cacheKey: ["share-v1", placeId],
    revalidate: SHARE_CACHE_SECONDS,
    usage: usageContext(null, feature),
  });

  if (!result.ok) return { status: "unavailable" };
  if (result.data?.status === "NOT_FOUND") return { status: "not_found" };
  const place = toPlacePreview(result.data?.result);
  return place ? { status: "ok", place } : { status: "not_found" };
}

/**
 * Google Place Photos are served through our own /api/place-photo route, never
 * straight from maps.googleapis.com. The old URLs embedded MAPS_API_KEY in the
 * query string, which meant the billing key shipped in every page's HTML, in
 * the mobile app's API responses, and (via saved itineraries) in the database.
 * Anyone, including scrapers, could lift it and spend against it.
 *
 * Client-safe on purpose (no server-only imports): format.ts's withMaxWidth()
 * runs in client components too.
 */

export const PHOTO_PROXY_PATH = "/api/place-photo";

// photo_reference values are URL-safe base64 in practice; this rejects anything
// that isn't, so the route can't be turned into a generic Google URL fetcher.
export const PHOTO_REF_PATTERN = /^[A-Za-z0-9_-]{10,2048}$/;

const MIN_WIDTH = 100;
const MAX_WIDTH = 1600;

/**
 * Rounds up to the next 100px so the many slightly different widths callers
 * ask for collapse into a handful of cacheable variants (each distinct URL is
 * a separate CDN entry and, on a miss, a separate billed Google request).
 */
export function clampPhotoWidth(width: number): number {
  if (!Number.isFinite(width)) return 800;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.ceil(width / 100) * 100));
}

export function photoProxyUrl(photoReference: string, maxWidth = 1200, origin = ""): string {
  const params = new URLSearchParams({ ref: photoReference, w: String(clampPhotoWidth(maxWidth)) });
  return `${origin.replace(/\/$/, "")}${PHOTO_PROXY_PATH}?${params.toString()}`;
}

const LEGACY_PHOTO_URL = "maps.googleapis.com/maps/api/place/photo";

export function isLegacyPhotoUrl(url: string): boolean {
  return url.includes(LEGACY_PHOTO_URL);
}

/**
 * Rewrites a stored key-bearing Google photo URL (old itinerary rows) into the
 * keyless proxy form. Anything else, including already-proxied URLs, comes
 * back untouched. If the old URL can't be parsed, it's dropped to an empty
 * string rather than returned, so a key can never leak through a bad parse.
 */
export function legacyPhotoToProxy(url: string, origin = ""): string {
  if (!isLegacyPhotoUrl(url)) return url;
  try {
    const parsed = new URL(url);
    const ref = parsed.searchParams.get("photo_reference");
    if (!ref || !PHOTO_REF_PATTERN.test(ref)) return "";
    const width = Number(parsed.searchParams.get("maxwidth"));
    return photoProxyUrl(ref, Number.isFinite(width) && width > 0 ? width : 1200, origin);
  } catch {
    return "";
  }
}

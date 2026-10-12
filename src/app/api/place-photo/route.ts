import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { PHOTO_REF_PATTERN, clampPhotoWidth } from "@/lib/google/photo-url";

/**
 * Keyless front door for Google Place Photos. Every experience image on the
 * site and in the mobile app points here instead of at maps.googleapis.com, so
 * MAPS_API_KEY stays server-side (it used to be embedded in each photo URL).
 *
 * Google answers a photo request with a 302 to a googleusercontent.com image
 * URL; only the maps.googleapis.com hop is billed. We follow nothing -- we just
 * pass that Location back, with cache headers so the CDN and the browser reuse
 * it instead of billing a fresh Google request on every view of the same photo.
 *
 * Public by necessity (an <img> tag can't send auth), so it's the one route
 * where cost abuse is cheapest -- hence the strict reference pattern, width
 * clamp, per-IP limit, and redirect-host allowlist below.
 */

const GOOGLE_PHOTO_ENDPOINT = "https://maps.googleapis.com/maps/api/place/photo";
const ALLOWED_REDIRECT_HOST = /(^|\.)googleusercontent\.com$/;

// Success: browsers keep it an hour, the CDN six. Failure (e.g. the billing
// account is on hold, or the reference expired): short but non-zero, so one
// outage doesn't turn every image on every page view into another Google call.
const CACHE_OK = "public, max-age=3600, s-maxage=21600";
const CACHE_FAILED = "public, max-age=60, s-maxage=300";

function failed(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": CACHE_FAILED } });
}

export async function GET(request: Request) {
  const key = process.env.MAPS_API_KEY;
  if (!key) return failed(404, "Photos are not configured.");

  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") ?? "";
  if (!PHOTO_REF_PATTERN.test(ref)) {
    return NextResponse.json({ error: "Invalid photo reference." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const width = clampPhotoWidth(Number(url.searchParams.get("w")));

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    checkRateLimit(`place-photo:${ip}`, 300, 60_000);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: { "Cache-Control": "no-store" } });
    }
    throw err;
  }

  const upstream = new URL(GOOGLE_PHOTO_ENDPOINT);
  upstream.searchParams.set("maxwidth", String(width));
  upstream.searchParams.set("photo_reference", ref);
  upstream.searchParams.set("key", key);

  let res: Response;
  try {
    res = await fetch(upstream.toString(), { redirect: "manual", cache: "no-store" });
  } catch (err) {
    console.error("[place-photo] fetch threw:", err);
    return failed(502, "Photo unavailable.");
  }

  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) {
    let target: URL;
    try {
      target = new URL(location);
    } catch {
      return failed(502, "Photo unavailable.");
    }
    if (target.protocol !== "https:" || !ALLOWED_REDIRECT_HOST.test(target.hostname)) {
      console.error("[place-photo] refusing redirect to unexpected host:", target.hostname);
      return failed(502, "Photo unavailable.");
    }
    return new Response(null, { status: 302, headers: { Location: target.toString(), "Cache-Control": CACHE_OK } });
  }

  // Google normally redirects, but if it ever returns the bytes directly, pass
  // them through rather than silently breaking every image.
  const contentType = res.headers.get("content-type") ?? "";
  if (res.ok && contentType.startsWith("image/")) {
    return new Response(res.body, { status: 200, headers: { "Content-Type": contentType, "Cache-Control": CACHE_OK } });
  }

  console.error("[place-photo] upstream failed:", res.status);
  return failed(404, "Photo unavailable.");
}

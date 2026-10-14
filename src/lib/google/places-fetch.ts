import { unstable_cache } from "next/cache";
import type { PlacesOperation } from "@/lib/config/usage";
import { estimatePlacesCost } from "@/lib/usage/costs";
import type { UsageContext } from "@/lib/usage/context";
import { assertWithinLimit, UsageLimitError } from "@/lib/usage/limits";
import { recordUsage, type UsageProvider } from "@/lib/usage/log";

/**
 * The one door every Google Maps Platform JSON request goes through
 * (Nearby Search, Place Details, Geocoding). It does three things the old
 * bare `fetch(url, { next: { revalidate } })` could not:
 *
 *   1. Logs a usage row ONLY when Google is actually called. The work runs
 *      inside unstable_cache, so a cache hit never reaches it. The old
 *      fetch-level cache gave no way to tell a hit from a real, billed call.
 *   2. Enforces the user's daily Places allowance before spending anything.
 *   3. Does not cache failures. A REQUEST_DENIED (for example, while the
 *      billing account is on hold) used to be cached for an hour like any
 *      other 200, which delayed recovery by up to an hour after billing was
 *      fixed. Only OK and ZERO_RESULTS answers are reused now.
 *
 * Photos are the exception (they redirect, and have their own route), see
 * app/api/place-photo/route.ts, which logs through recordUsage directly.
 */

// Definitive answers, safe to reuse. NOT_FOUND (Place Details for an id that
// does not exist) is one: caching it stops a bad id being looked up, and
// billed, again on every request.
const OK_STATUSES = new Set(["OK", "ZERO_RESULTS", "NOT_FOUND"]);

class GoogleStatusError extends Error {
  constructor(public readonly status: string) {
    super(`Google responded ${status}`);
  }
}

export interface GoogleJsonResult<T> {
  ok: boolean;
  data?: T;
  /** Google's status (or "HTTP 503", or a network error) when ok is false. */
  status?: string;
  /** True when the call was refused locally because the daily limit was reached. */
  limited?: boolean;
}

export async function fetchGoogleJson<T extends { status: string }>(opts: {
  operation: PlacesOperation;
  /** Full request URL, including the API key. Never part of the cache key. */
  url: string;
  /** What identifies this request in the cache. Must NOT contain the API key. */
  cacheKey: string[];
  /** Seconds an answer may be reused. false = never cached (every call reaches Google). */
  revalidate: number | false;
  usage?: UsageContext;
}): Promise<GoogleJsonResult<T>> {
  const provider: UsageProvider =
    opts.operation === "geocode" || opts.operation === "reverse_geocode" ? "google_geocoding" : "google_places";
  let limited = false;

  // Runs only on a cache miss (or when caching is off): this is a real call.
  const callGoogle = async (): Promise<T> => {
    try {
      await assertWithinLimit(opts.usage, "places");
    } catch (err) {
      if (err instanceof UsageLimitError) {
        limited = true;
        recordUsage(opts.usage, { provider, operation: opts.operation, estCostUsd: 0, outcome: "blocked" });
      }
      throw err;
    }

    let res: Response;
    try {
      res = await fetch(opts.url, { cache: "no-store" });
    } catch (err) {
      recordUsage(opts.usage, { provider, operation: opts.operation, estCostUsd: 0, outcome: "error" });
      throw err;
    }
    if (!res.ok) {
      recordUsage(opts.usage, { provider, operation: opts.operation, estCostUsd: 0, outcome: "error" });
      throw new GoogleStatusError(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as T;
    if (!OK_STATUSES.has(data.status)) {
      recordUsage(opts.usage, { provider, operation: opts.operation, estCostUsd: 0, outcome: "error" });
      throw new GoogleStatusError(data.status);
    }

    recordUsage(opts.usage, { provider, operation: opts.operation, estCostUsd: estimatePlacesCost(opts.operation) });
    return data;
  };

  try {
    const data =
      opts.revalidate === false
        ? await callGoogle()
        : await unstable_cache(callGoogle, ["google", opts.operation, ...opts.cacheKey], {
            revalidate: opts.revalidate,
          })();
    return { ok: true, data };
  } catch (err) {
    if (limited) return { ok: false, limited: true, status: "LIMIT" };
    if (err instanceof GoogleStatusError) return { ok: false, status: err.status };
    console.error("[google] request failed:", opts.operation, err);
    return { ok: false, status: "ERROR" };
  }
}

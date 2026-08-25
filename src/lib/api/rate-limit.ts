import { ApiError } from "./auth";

/**
 * In-memory sliding-window rate limiter for expensive (AI) endpoints.
 * Good enough for a single-instance/dev deployment; on Vercel's serverless
 * runtime each instance has its own memory, so treat this as a soft cap.
 * For a hard, correct limit across instances, swap this for Upstash Redis
 * or Vercel KV using the same checkRateLimit() call signature.
 */
const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    throw new ApiError(429, "You're making requests too quickly. Try again in a moment.");
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
}

declare global {
  interface Window {
    endorsely_referral?: string | null;
  }
}

/**
 * Reads the current visitor's Endorsely affiliate-referral id, set on
 * `window` by the endorsely.js script (see
 * src/components/shared/endorsely.tsx) once it resolves a referral cookie
 * or URL param. Safe to call unconditionally — returns undefined if the
 * script hasn't loaded, hasn't resolved yet, or there's no active referral,
 * so callers can pass the result straight into a Stripe checkout request
 * without a null check of their own.
 */
export function getEndorselyReferral(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.endorsely_referral ?? undefined;
}

import type { BillingInterval } from "@/lib/config/pricing";

const STORAGE_KEY = "zolo:billingInterval";

/**
 * Remembers the user's monthly/annual toggle choice across the homepage
 * pricing section and /profile/upgrade — so someone who picks "Annual" on
 * the homepage, then signs up and lands on the upgrade page, sees the same
 * choice already selected instead of silently reverting to monthly.
 */
export function getBillingPreference(): BillingInterval {
  if (typeof window === "undefined") return "monthly";
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "annual" ? "annual" : "monthly";
  } catch {
    return "monthly";
  }
}

export function setBillingPreference(interval: BillingInterval): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, interval);
  } catch {
    // Best-effort only — not worth surfacing a storage failure to the user.
  }
}

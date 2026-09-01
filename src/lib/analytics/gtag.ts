export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a GA4 event client-side. Safe to call unconditionally — no-ops if
 * GA isn't configured (NEXT_PUBLIC_GA_MEASUREMENT_ID unset, e.g. local dev)
 * or the script hasn't loaded yet for any reason. GA4's own "Traffic
 * acquisition" report already segments pageviews by referrer/UTM source
 * automatically (config'd in GoogleAnalytics — see
 * src/components/shared/google-analytics.tsx), so this is only for custom
 * conversion events like sign_up, not pageviews.
 */
export function gtagEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}

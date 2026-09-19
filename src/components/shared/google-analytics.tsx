import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";

/**
 * Loads gtag.js and initializes GA4. Renders nothing if
 * NEXT_PUBLIC_GA_MEASUREMENT_ID isn't set (e.g. local dev without it
 * configured) rather than loading a broken/unconfigured tracker.
 *
 * The inline shim below (which defines window.gtag/dataLayer) stays
 * afterInteractive — it's sub-millisecond, and this is Google's own
 * documented snippet order: the shim queues gtag() calls into dataLayer
 * whether or not the real gtag.js library has loaded yet, so gtagEvent()
 * calls never get silently dropped waiting on it. Only the actual gtag.js
 * network script — 324ms of bootup time and two separate long tasks in a
 * 2026-09-18 Lighthouse run — is deferred to lazyOnload; once it finally
 * loads, it drains whatever queued into dataLayer in the meantime.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="lazyOnload" />
    </>
  );
}

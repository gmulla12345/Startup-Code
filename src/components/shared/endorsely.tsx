import Script from "next/script";

/**
 * Endorsely affiliate-click tracking. Renders nothing if
 * NEXT_PUBLIC_ENDORSELY_ID isn't set (e.g. local dev without it configured)
 * rather than loading a broken/unconfigured tracker — same pattern as
 * GoogleAnalytics.
 */
export function Endorsely() {
  const endorselyId = process.env.NEXT_PUBLIC_ENDORSELY_ID;
  if (!endorselyId) return null;

  return (
    <Script
      src="https://assets.endorsely.com/endorsely.js"
      data-endorsely={endorselyId}
      strategy="afterInteractive"
    />
  );
}

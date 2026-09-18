import * as Sentry from "@sentry/nextjs";

// No tracesSampleRate — this project only ever wanted error monitoring
// (see CLAUDE.md), not performance tracing, and the tracing instrumentation
// isn't free: a Lighthouse run (2026-09-18) found it was the single largest
// contributor to Total Blocking Time on every page load (~2.35s of a ~2.6s
// total), all to report traces that were only sampled at 10% anyway. Paired
// with bundleSizeOptimizations.excludeTracing in next.config.ts, which
// actually tree-shakes the tracing code out of the client bundle — setting
// tracesSampleRate here alone would NOT have removed it, since
// @sentry/nextjs includes browser tracing by default regardless of sample
// rate unless that build flag says otherwise.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

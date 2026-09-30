// Sentry is loaded after the page is idle instead of in the shared first-load
// chunk (~60 KB of JS every visitor downloaded and parsed before LCP).
// Tradeoff: errors thrown before it loads (first seconds) are not reported.
// Only Vercel builds report (see src/instrumentation.ts).
if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NEXT_PUBLIC_VERCEL_ENV) {
  const start = () => {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
      });
    });
  };
  if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 5000 });
  else setTimeout(start, 3000);
}

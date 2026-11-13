// Which deployment this is: "production", "preview", or undefined for local
// runs, tests and CI. Self-hosted builds set NEXT_PUBLIC_APP_ENV; Vercel's own
// variable is the fallback until the Vercel project is gone. NEXT_PUBLIC_ so the
// value is inlined into client bundles too (Sentry in instrumentation-client).
export const APP_ENV: string | undefined =
  process.env.NEXT_PUBLIC_APP_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;

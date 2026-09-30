import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Only Vercel deployments report — local runs, tests and CI share the DSN
  // from env files and used to flood the project as "production".
  if (!process.env.SENTRY_DSN || !process.env.VERCEL_ENV) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV,
  });
}

export const onRequestError = Sentry.captureRequestError;

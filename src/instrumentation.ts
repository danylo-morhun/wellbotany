import * as Sentry from "@sentry/nextjs";
import { APP_ENV } from "@/lib/app-env";

export async function register() {
  // Only real deployments report — local runs, tests and CI share the DSN
  // from env files and used to flood the project as "production".
  if (!process.env.SENTRY_DSN || !APP_ENV) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: APP_ENV,
  });
}

export const onRequestError = Sentry.captureRequestError;

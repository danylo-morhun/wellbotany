// Which deployment this is: "production", "preview", or undefined for local
// runs, tests and CI. Set by NEXT_PUBLIC_APP_ENV in the deployment's env;
// NEXT_PUBLIC_ so the value is inlined into client bundles too (Sentry in
// instrumentation-client).
export const APP_ENV: string | undefined = process.env.NEXT_PUBLIC_APP_ENV || undefined;

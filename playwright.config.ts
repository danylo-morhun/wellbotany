import { defineConfig, devices } from "@playwright/test";

// Local .env / .env.local point at production — e2e seeds and deletes rows, so
// refuse to run unless DATABASE_URL is passed explicitly and is not prod.
const PROD_DB_ENDPOINT = "ep-lingering-cake";
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes(PROD_DB_ENDPOINT)) {
  throw new Error("e2e: pass a non-production DATABASE_URL explicitly (e.g. the dev Neon branch)");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // specs share one server + DB — keep sequential to avoid seed collisions
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // A production build avoids next-dev's on-demand webpack compilation
    // (which races under concurrent first-hit requests) and matches what
    // actually ships.
    command: "npx next build && npx next start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Explicit env wins over .env files: no prod side effects (e-mails, rate
    // limits, Sentry) unless E2E_EMAIL opts into real e-mails to a test inbox.
    env: {
      P24_SANDBOX_BYPASS: "true",
      AUTH_URL: "http://localhost:3000",
      AUTH_TRUST_HOST: "true",
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      SENTRY_DSN: "",
      NEXT_PUBLIC_SENTRY_DSN: "",
      ...(process.env.E2E_EMAIL
        ? { SHOP_NOTIFY_EMAIL: process.env.E2E_EMAIL }
        : { RESEND_API_KEY: "" }),
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});

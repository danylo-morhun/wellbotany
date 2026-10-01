import { config } from "dotenv";
import { vi } from "vitest";
import { nextHeadersMock } from "./mocks/next-headers";

config({ path: ".env.local", quiet: true });

// Tests must not depend on (or pollute) the shared Upstash rate-limit counters —
// clearing these forces src/lib/rate-limit.ts's limiters to their no-op path.
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";
// Skip the real Przelewy24 API call in placeOrder.
process.env.P24_SANDBOX_BYPASS = "true";
// Never send real e-mails from tests (email helpers no-op without a key).
process.env.RESEND_API_KEY = "";

vi.mock("next/headers", () => nextHeadersMock);

// after() needs a request scope — run the task on the next tick instead.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: unknown) => {
    if (typeof task === "function")
      void Promise.resolve()
        .then(task as () => unknown)
        .catch(() => {});
  },
}));

// unstable_cache needs Next's incremental cache — outside it, call through.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
  updateTag: () => {},
}));

// next-auth (beta) relies on Next.js's bundler resolution for its internal
// "next/server" import — it can't be loaded as-is under plain Vite/Node ESM.
// src/lib/safe-action.ts imports `auth` unconditionally for every action
// client, even ones (actionClient) that never call it, so any action module
// drags next-auth in. Only auth-gated actions need real session behavior,
// and those aren't covered by these tests — a stub is enough.
vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  }),
  AuthError: class AuthError extends Error {},
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: (config: unknown) => config,
}));

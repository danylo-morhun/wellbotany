import { headers } from "next/headers";
import { ActionError } from "@/lib/action-error";
import { redis } from "@/lib/redis";

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000 } as const;

/**
 * Fixed-window limiter in Redis: `requests` per window per identifier.
 * Fails open — if Redis is down the request goes through (nginx still caps
 * /api/auth/ per IP).
 */
export type Limiter = { limit(identifier: string): Promise<{ success: boolean }> };

/** No-op (never rate-limits) when REDIS_URL is unset — e.g. tests. */
function makeLimiter(
  prefix: string,
  requests: number,
  window: `${number} ${keyof typeof UNIT_MS}`,
): Limiter | null {
  const client = redis;
  if (!client) return null;
  const [amount, unit] = window.split(" ") as [string, keyof typeof UNIT_MS];
  const windowMs = Number(amount) * UNIT_MS[unit];
  return {
    async limit(identifier) {
      try {
        const count = await client.incrWindow(`ratelimit:${prefix}:${identifier}`, windowMs);
        return { success: count <= requests };
      } catch (e) {
        console.error("rate limit skipped:", e);
        return { success: true };
      }
    },
  };
}

export const loginLimiter = makeLimiter("login", 10, "1 m");
export const registerLimiter = makeLimiter("register", 5, "1 h");
export const checkoutLimiter = makeLimiter("checkout", 20, "1 m");
export const couponLimiter = makeLimiter("coupon", 20, "1 m");
export const reviewLimiter = makeLimiter("review", 10, "1 h");
export const newsletterLimiter = makeLimiter("newsletter", 5, "1 h");
export const consentLimiter = makeLimiter("consent", 20, "1 m");
export const withdrawalLimiter = makeLimiter("withdrawal", 10, "1 h");

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function assertNotRateLimited(
  limiter: Limiter | null,
  identifier: string,
): Promise<void> {
  if (!limiter) return;
  const { success } = await limiter.limit(identifier);
  if (!success) {
    throw new ActionError("Zbyt wiele prób. Spróbuj ponownie za kilka minut.");
  }
}

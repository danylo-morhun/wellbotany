import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { ActionError } from "@/lib/action-error";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/** No-op (never rate-limits) when Upstash env vars are absent — e.g. local dev. */
function makeLimiter(prefix: string, requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    prefix: `ratelimit:${prefix}`,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

export const loginLimiter = makeLimiter("login", 10, "1 m");
export const registerLimiter = makeLimiter("register", 5, "1 h");
export const checkoutLimiter = makeLimiter("checkout", 20, "1 m");
export const couponLimiter = makeLimiter("coupon", 20, "1 m");

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function assertNotRateLimited(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<void> {
  if (!limiter) return;
  const { success } = await limiter.limit(identifier);
  if (!success) {
    throw new ActionError("Zbyt wiele prób. Spróbuj ponownie za kilka minut.");
  }
}

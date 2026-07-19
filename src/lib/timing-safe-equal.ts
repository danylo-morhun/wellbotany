import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for secrets (webhook tokens, cron auth).
 * Hashing first sidesteps timingSafeEqual's equal-length requirement without
 * leaking length via an early-return check.
 */
export function safeCompare(a: string, b: string): boolean {
  const ah = createHash("sha256").update(a).digest();
  const bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}

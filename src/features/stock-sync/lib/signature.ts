import { createHmac } from "node:crypto";
import { safeCompare } from "@/lib/timing-safe-equal";

// Requests older or newer than this are refused, so a captured one can't be replayed later
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Each shop has its own secret: SUBIEKT_SYNC_SECRET_SKLEP1 for location "sklep1". */
export function locationSecret(code: string): string | undefined {
  return process.env[`SUBIEKT_SYNC_SECRET_${code.toUpperCase()}`] || undefined;
}

/** hex HMAC-SHA256 over "<timestamp>.<raw body>" — the agent signs the same string */
export function signSnapshot(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifySnapshot(
  secret: string,
  timestamp: string,
  body: string,
  signature: string,
  now = Date.now(),
): boolean {
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(now - ts) > MAX_CLOCK_SKEW_MS) return false;
  return safeCompare(signature, signSnapshot(secret, timestamp, body));
}

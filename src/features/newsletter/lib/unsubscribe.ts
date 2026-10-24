import { createHmac, timingSafeEqual } from "node:crypto";

// Signed unsubscribe link: no token column needed, and nobody can unsubscribe
// an address they don't hold a newsletter e-mail for

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wellbotany.pl";

function sign(email: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret)
    .update(`newsletter-unsubscribe:${email.toLowerCase()}`)
    .digest("base64url");
}

export function isValidUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(sign(email));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function query(email: string): string {
  return `e=${encodeURIComponent(email.toLowerCase())}&t=${sign(email)}`;
}

/** Page with a confirm button — link scanners that prefetch it don't unsubscribe anyone */
export function unsubscribePageUrl(email: string): string {
  return `${SITE_URL}/newsletter/wypisz?${query(email)}`;
}

/** RFC 8058 one-click endpoint for the List-Unsubscribe header (POST only) */
export function unsubscribeOneClickUrl(email: string): string {
  return `${SITE_URL}/api/newsletter/unsubscribe?${query(email)}`;
}

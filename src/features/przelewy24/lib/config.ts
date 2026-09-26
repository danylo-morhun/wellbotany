/**
 * Online payments (Przelewy24: BLIK, cards, Apple/Google Pay, pay-by-link) are
 * off unless P24_ENABLED="true" — the shop launches with bank transfer and
 * in-store payment until the merchant account is live.
 */
export function isP24Enabled(): boolean {
  return process.env.P24_ENABLED === "true";
}

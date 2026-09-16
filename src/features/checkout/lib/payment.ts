export const PAYMENT_LABELS: Record<string, string> = {
  BLIK: "BLIK",
  PRZELEWY24: "Przelew online (Przelewy24)",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  BANK_TRANSFER: "Przelew tradycyjny",
  CASH_ON_DELIVERY: "Płatność przy odbiorze",
};

/** Paid outside Przelewy24 — no online transaction is registered for these. */
export function isOfflinePayment(method: string): boolean {
  return method === "BANK_TRANSFER" || method === "CASH_ON_DELIVERY";
}

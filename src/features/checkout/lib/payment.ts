export const PAYMENT_LABELS: Record<string, string> = {
  BLIK: "BLIK",
  PRZELEWY24: "Przelew online (Przelewy24)",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  BANK_TRANSFER: "Przelew tradycyjny",
  CASH_ON_DELIVERY: "Płatność przy odbiorze",
};

/**
 * Whether checkout offers a method. Traditional bank transfer is only a fallback
 * while Przelewy24 is off (owner decision 2026-11-14: P24 already covers bank
 * transfers via pay-by-link, and manual transfers need daily statement checks).
 * Pay-at-pickup is gated separately by the PICKUP shipping method.
 */
export function isPaymentMethodAvailable(method: string, onlinePaymentsEnabled: boolean): boolean {
  if (method === "BANK_TRANSFER") return !onlinePaymentsEnabled;
  if (method === "CASH_ON_DELIVERY") return true;
  return onlinePaymentsEnabled;
}

/** Preselected method in checkout */
export function defaultPaymentMethod(onlinePaymentsEnabled: boolean) {
  return onlinePaymentsEnabled ? ("BLIK" as const) : ("BANK_TRANSFER" as const);
}

/** Paid outside Przelewy24 — no online transaction is registered for these. */
export function isOfflinePayment(method: string): boolean {
  return method === "BANK_TRANSFER" || method === "CASH_ON_DELIVERY";
}

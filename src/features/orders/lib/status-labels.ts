export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekujące",
  PAYMENT_PENDING: "Oczekuje na płatność",
  PAID: "Opłacone",
  PROCESSING: "W realizacji",
  SHIPPED: "Wysłane",
  DELIVERED: "Dostarczone",
  CANCELLED: "Anulowane",
  REFUNDED: "Zwrócone",
};

// Pickup orders reuse SHIPPED/DELIVERED for "ready in store"/"collected".
const PICKUP_STATUS_LABELS: Record<string, string> = {
  SHIPPED: "Gotowe do odbioru",
  DELIVERED: "Odebrane",
};

export function orderStatusLabel(status: string, shippingMethod: string): string {
  return (
    (shippingMethod === "PICKUP" ? PICKUP_STATUS_LABELS[status] : undefined) ??
    ORDER_STATUS_LABELS[status] ??
    status
  );
}

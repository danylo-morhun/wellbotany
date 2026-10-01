import type { OrderStatus } from "@prisma/client";

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

/** Paid (or pay-at-pickup) orders waiting to be packed and handed over */
export const TO_PACK_STATUSES: OrderStatus[] = ["PAID", "PROCESSING"];

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "primary";

export const ORDER_STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: "neutral",
  PAYMENT_PENDING: "warning",
  PAID: "primary",
  PROCESSING: "info",
  SHIPPED: "success",
  DELIVERED: "neutral",
  CANCELLED: "danger",
  REFUNDED: "danger",
};

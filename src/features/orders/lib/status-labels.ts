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

/** What a status change does beyond the label — shown before the admin confirms it */
export function statusChangeConsequence(
  status: string,
  shippingMethod: string | null,
): string | null {
  switch (status) {
    case "CANCELLED":
      return "Produkty wrócą na stan magazynowy, a użycie kodu rabatowego zostanie zwolnione.";
    case "SHIPPED":
      if (shippingMethod === "PICKUP")
        return "Klient dostanie e-mail, że zamówienie czeka na odbiór.";
      if (shippingMethod)
        return "Klient dostanie e-mail z numerem przesyłki i linkiem do śledzenia.";
      return "Klienci dostaną e-mail z numerem przesyłki albo informacją, że zamówienie czeka na odbiór.";
    case "DELIVERED":
      return shippingMethod
        ? "Klient dostanie prośbę o opinię o produktach."
        : "Klienci dostaną prośbę o opinię o produktach.";
    default:
      return null;
  }
}

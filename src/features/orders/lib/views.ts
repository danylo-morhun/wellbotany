import type { OrderStatus } from "@prisma/client";
import { TO_PACK_STATUSES } from "./status-labels";

export type OrderView = {
  key: string;
  label: string;
  statuses: OrderStatus[] | null;
  /** Work queues read oldest first */
  oldestFirst?: boolean;
};

export const ORDER_VIEWS: OrderView[] = [
  { key: "wszystkie", label: "Wszystkie", statuses: null },
  { key: "do-spakowania", label: "Do spakowania", statuses: TO_PACK_STATUSES, oldestFirst: true },
  {
    key: "czeka-na-platnosc",
    label: "Czeka na płatność",
    statuses: ["PENDING", "PAYMENT_PENDING"],
    oldestFirst: true,
  },
  { key: "wyslane", label: "Wysłane / do odbioru", statuses: ["SHIPPED"] },
  { key: "zakonczone", label: "Zakończone", statuses: ["DELIVERED"] },
  { key: "anulowane", label: "Anulowane", statuses: ["CANCELLED", "REFUNDED"] },
];

export function resolveOrderView(key: string | undefined): OrderView {
  return ORDER_VIEWS.find((v) => v.key === key) ?? ORDER_VIEWS[0];
}

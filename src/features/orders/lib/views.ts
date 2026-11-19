import type { Prisma } from "@prisma/client";

export type OrderView = {
  key: string;
  label: string;
  where: Prisma.OrderWhereInput | null;
  /** Work queues read oldest first */
  oldestFirst?: boolean;
};

export const ORDER_VIEWS: OrderView[] = [
  { key: "wszystkie", label: "Wszystkie", where: null },
  {
    key: "do-spakowania",
    label: "Do spakowania",
    // Paid, no label yet; pickup / pay-at-pickup orders sit in PROCESSING until ready
    where: { OR: [{ status: "PAID" }, { status: "PROCESSING", epakaOrderId: null }] },
    oldestFirst: true,
  },
  {
    key: "do-nadania",
    label: "Do nadania",
    where: { status: "PROCESSING", epakaOrderId: { not: null } },
    oldestFirst: true,
  },
  {
    key: "czeka-na-platnosc",
    label: "Czeka na płatność",
    where: { status: { in: ["PENDING", "PAYMENT_PENDING"] } },
    oldestFirst: true,
  },
  { key: "wyslane", label: "Wysłane / do odbioru", where: { status: "SHIPPED" } },
  {
    key: "problemy",
    label: "Problemy z przesyłką",
    where: { shipmentAlert: { not: null } },
    oldestFirst: true,
  },
  { key: "zakonczone", label: "Zakończone", where: { status: "DELIVERED" } },
  { key: "anulowane", label: "Anulowane", where: { status: { in: ["CANCELLED", "REFUNDED"] } } },
];

export function resolveOrderView(key: string | undefined): OrderView {
  return ORDER_VIEWS.find((v) => v.key === key) ?? ORDER_VIEWS[0];
}

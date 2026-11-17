import type { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { addBusinessDays, warsawDay } from "@/lib/business-days";

// Google Customer Reviews opt-in on the order confirmation page.

type GcrOrder = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  paidAt: Date | null;
};

// We ship within 2 working days of payment, the carrier takes 1–2 more.
// Later is safer: Google mails the survey a few days after this date.
const DELIVERY_BUSINESS_DAYS = 4;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Estimated delivery date for Google, "YYYY-MM-DD" (Warsaw). */
export function gcrDeliveryDate(order: Pick<GcrOrder, "createdAt" | "paidAt">): string {
  return addBusinessDays(warsawDay(order.paidAt ?? order.createdAt), DELIVERY_BUSINESS_DAYS);
}

/** Paid (or cash on delivery), not cancelled, placed within the last 7 days. */
export function showGcrOptIn(order: GcrOrder, now: Date): boolean {
  const willBePaid =
    order.paymentStatus === "CAPTURED" || order.paymentMethod === "CASH_ON_DELIVERY";
  const fresh = now.getTime() - order.createdAt.getTime() <= MAX_AGE_MS;
  return willBePaid && order.status !== "CANCELLED" && fresh;
}

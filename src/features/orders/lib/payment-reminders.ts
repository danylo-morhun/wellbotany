// Unpaid prepaid orders (regulamin §5): pay within 3 working days; after that
// one e-mail reminder sets an extra 7 days (KC art. 491), after which the shop
// may withdraw — the shop inbox is told the day the extra time runs out.
// Nothing ships before payment (§6 pkt 2). Run daily by wb-payment-reminders.timer.
import { addBusinessDays, addDays, warsawDay } from "@/lib/business-days";

export const PAY_WITHIN_BUSINESS_DAYS = 3;
export const EXTRA_DAYS = 7;

/** Last day (Warsaw) to pay an order placed at `createdAt`. */
export function paymentDueDay(createdAt: Date): string {
  return addBusinessDays(warsawDay(createdAt), PAY_WITHIN_BUSINESS_DAYS);
}

/** Last day of the extra time given in a reminder sent at `sentAt`. */
export function extraDueDay(sentAt: Date): string {
  return addDays(warsawDay(sentAt), EXTRA_DAYS);
}

export function reminderDue(order: { createdAt: Date }, now: Date): boolean {
  return warsawDay(now) > paymentDueDay(order.createdAt);
}

/** True exactly on the first day after the extra time ran out. */
export function extraTimeJustEnded(order: { paymentReminderSentAt: Date }, now: Date): boolean {
  return warsawDay(now) === addDays(extraDueDay(order.paymentReminderSentAt), 1);
}

/** "2026-11-23" → "23.11.2026" */
export const plDate = (day: string) => day.split("-").reverse().join(".");

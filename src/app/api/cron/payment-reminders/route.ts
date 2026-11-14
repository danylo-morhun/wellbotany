// Daily (wb-payment-reminders.timer, 10:00): reminds customers whose prepaid
// order is past the 3-working-day payment term and tells the shop which orders
// ran out of the extra time. See features/orders/lib/payment-reminders.ts.
import { NextResponse } from "next/server";
import {
  extraDueDay,
  extraTimeJustEnded,
  reminderDue,
} from "@/features/orders/lib/payment-reminders";
import {
  sendPaymentReminderEmail,
  sendPaymentReminderSummary,
} from "@/lib/email/payment-reminder-emails";
import { prisma } from "@/lib/prisma";
import { safeCompare } from "@/lib/timing-safe-equal";

export const dynamic = "force-dynamic";

// Older orders are left to the shop — a reminder weeks later would confuse
const LOOKBACK_DAYS = 30;

export async function GET(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeCompare(header, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const unpaid = await prisma.order.findMany({
    where: {
      status: "PAYMENT_PENDING",
      paymentStatus: { not: "CAPTURED" },
      paymentMethod: { not: "CASH_ON_DELIVERY" },
      totalPln: { gt: 0 },
      createdAt: { gte: new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000) },
    },
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      totalPln: true,
      paymentMethod: true,
      createdAt: true,
      paymentReminderSentAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const reminded: { orderNumber: string; totalPln: number; due: string }[] = [];
  const expired: { orderNumber: string; totalPln: number }[] = [];
  const failed: string[] = [];

  for (const order of unpaid) {
    if (order.paymentReminderSentAt) {
      if (extraTimeJustEnded({ paymentReminderSentAt: order.paymentReminderSentAt }, now)) {
        expired.push(order);
      }
      continue;
    }
    if (!reminderDue(order, now)) continue;
    try {
      // Claim first, so an overlapping run can't send twice
      const claimed = await prisma.order.updateMany({
        where: { id: order.id, paymentReminderSentAt: null },
        data: { paymentReminderSentAt: now },
      });
      if (claimed.count === 0) continue;
      const sent = await sendPaymentReminderEmail(order, now);
      if (!sent) {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentReminderSentAt: null },
        });
        continue;
      }
      reminded.push({ ...order, due: extraDueDay(now) });
    } catch (e) {
      console.error(`[payment-reminders] ${order.orderNumber}:`, e);
      await prisma.order
        .update({ where: { id: order.id }, data: { paymentReminderSentAt: null } })
        .catch(console.error);
      failed.push(order.orderNumber);
    }
  }

  await sendPaymentReminderSummary(reminded, expired).catch(console.error);
  return NextResponse.json({
    ok: failed.length === 0,
    reminded: reminded.map((o) => o.orderNumber),
    expired: expired.map((o) => o.orderNumber),
    failed,
  });
}

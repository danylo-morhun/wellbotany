"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { hasOrderAccess } from "@/features/checkout/lib/order-access";
import { isOfflinePayment } from "@/features/checkout/lib/payment";
import { ActionError } from "@/lib/action-error";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertNotRateLimited, checkoutLimiter, getClientIp } from "@/lib/rate-limit";
import { actionClient } from "@/lib/safe-action";
import { paymentUrl, registerTransaction } from "./lib/client";
import { isP24Enabled } from "./lib/config";
import { retrySessionId } from "./lib/session";

/** "Zapłać ponownie" on the confirmation page: a new P24 transaction for an unpaid order. */
export const retryOnlinePayment = actionClient
  .schema(z.object({ orderNumber: z.string().min(1).max(32) }))
  .action(async ({ parsedInput: { orderNumber } }) => {
    if (!isP24Enabled()) throw new ActionError("Płatności online są wyłączone.");
    await assertNotRateLimited(checkoutLimiter, await getClientIp());

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        customerId: true,
        customerEmail: true,
        totalPln: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
      },
    });
    const session = await auth();
    const canPay =
      !!order &&
      ((!!order.customerId && order.customerId === session?.user?.id) ||
        (await hasOrderAccess(orderNumber)));
    if (!order || !canPay) throw new ActionError("Nie znaleziono zamówienia.");
    if (
      order.paymentStatus === "CAPTURED" ||
      isOfflinePayment(order.paymentMethod) ||
      order.status !== "PAYMENT_PENDING" ||
      order.totalPln === 0
    ) {
      throw new ActionError("To zamówienie nie czeka na płatność online.");
    }

    const h = await headers();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
    const token = await registerTransaction({
      sessionId: retrySessionId(order.orderNumber),
      amount: order.totalPln,
      description: `Zamówienie ${order.orderNumber}`,
      email: order.customerEmail,
      urlReturn: `${appUrl}/zamowienie/potwierdzenie/${order.orderNumber}`,
      urlStatus: `${appUrl}/api/p24/notify`,
    });
    return { redirectUrl: paymentUrl(token) };
  });

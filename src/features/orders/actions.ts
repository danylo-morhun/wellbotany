"use server";

import { revalidatePath, updateTag } from "next/cache";
import { noteOrdersChanged } from "@/features/stock-sync/lib/levels-cache";
import { SUBIEKT_ORDERS_TAG } from "@/features/stock-sync/lib/orders-tag";
import { ActionError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { applyOrderStatus } from "./lib/apply-status";
import {
  bulkMarkOrdersPaidSchema,
  bulkUpdateOrderStatusSchema,
  markOrderInSubiektSchema,
  markOrderPaidSchema,
  updateOrderStatusSchema,
} from "./schema";

export const updateOrderStatus = adminActionClient
  .schema(updateOrderStatusSchema)
  .action(async ({ parsedInput: input }) => {
    await applyOrderStatus(input);
    return { success: true };
  });

/** Sequential on purpose — each change may send an e-mail; failures are reported per order. */
export const bulkUpdateOrderStatus = adminActionClient
  .schema(bulkUpdateOrderStatusSchema)
  .action(async ({ parsedInput: { orderIds, status } }) => {
    const failed: { orderId: string; error: string }[] = [];
    for (const orderId of orderIds) {
      try {
        await applyOrderStatus({ orderId, status });
      } catch (e) {
        failed.push({
          orderId,
          error: e instanceof ActionError ? e.message : "Nieznany błąd",
        });
      }
    }
    return { updated: orderIds.length - failed.length, failed };
  });

async function applyMarkPaid(orderId: string) {
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true },
  });
  if (!existing) throw new ActionError("Zamówienie nie istnieje");
  if (existing.paymentStatus === "CAPTURED") {
    throw new ActionError("Zamówienie jest już opłacone");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "CAPTURED",
      paidAt: new Date(),
      // Don't move an order backwards if it's already being fulfilled
      ...((existing.status === "PENDING" || existing.status === "PAYMENT_PENDING") && {
        status: "PAID",
      }),
    },
  });
  updateTag(SUBIEKT_ORDERS_TAG);
  await noteOrdersChanged();
  revalidatePath(`/admin/zamowienia/${orderId}`);
}

export const markOrderPaid = adminActionClient
  .schema(markOrderPaidSchema)
  .action(async ({ parsedInput: { orderId } }) => {
    await applyMarkPaid(orderId);
    revalidatePath("/admin/zamowienia");
    return { success: true };
  });

// Subiekt stock sync: until an order is entered in Subiekt, its items are held
// back from the stock the sync reports. The next sync settles ProductVariant.stock.
export const markOrderInSubiekt = adminActionClient
  .schema(markOrderInSubiektSchema)
  .action(async ({ parsedInput: { orderId, entered } }) => {
    await prisma.order.update({
      where: { id: orderId },
      data: { subiektEnteredAt: entered ? new Date() : null },
    });
    updateTag(SUBIEKT_ORDERS_TAG);
    await noteOrdersChanged();
    revalidatePath(`/admin/zamowienia/${orderId}`);
    return { success: true };
  });

export const bulkMarkOrdersPaid = adminActionClient
  .schema(bulkMarkOrdersPaidSchema)
  .action(async ({ parsedInput: { orderIds } }) => {
    const failed: { orderId: string; error: string }[] = [];
    for (const orderId of orderIds) {
      try {
        await applyMarkPaid(orderId);
      } catch (e) {
        failed.push({
          orderId,
          error: e instanceof ActionError ? e.message : "Nieznany błąd",
        });
      }
    }
    revalidatePath("/admin/zamowienia");
    return { updated: orderIds.length - failed.length, failed };
  });

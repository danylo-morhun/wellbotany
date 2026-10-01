"use server";

import { revalidatePath, updateTag } from "next/cache";
import { syncCancellation } from "@/features/orders/lib/cancellation";
import { buildTrackingUrl } from "@/features/orders/lib/tracking-url";
import { requestOrderReview } from "@/features/reviews/lib/request";
import { ActionError } from "@/lib/action-error";
import { sendPickupReadyEmail, sendTrackingEmail } from "@/lib/email/order-emails";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import {
  bulkMarkOrdersPaidSchema,
  bulkUpdateOrderStatusSchema,
  markOrderPaidSchema,
  type UpdateOrderStatusInput,
  updateOrderStatusSchema,
} from "./schema";

async function applyOrderStatus(input: UpdateOrderStatusInput) {
  const existing = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { status: true, trackingNumber: true, shippingMethod: true },
  });
  if (!existing) throw new ActionError("Zamówienie nie istnieje");

  const isPickup = existing.shippingMethod === "PICKUP";
  // Tracking input is only rendered for SHIPPED — keep the stored number when it's absent
  const trackingNumber = isPickup
    ? null
    : input.trackingNumber?.trim() || existing.trackingNumber || null;
  if (input.status === "SHIPPED" && !isPickup && !trackingNumber) {
    throw new ActionError("Podaj numer przesyłki, aby oznaczyć zamówienie jako wysłane");
  }
  const trackingUrl = trackingNumber
    ? buildTrackingUrl(existing.shippingMethod, trackingNumber)
    : null;

  const shouldSendPickupEmail =
    isPickup && input.status === "SHIPPED" && existing.status !== "SHIPPED";
  const shouldSendTrackingEmail =
    !isPickup &&
    input.status === "SHIPPED" &&
    !!trackingNumber &&
    (existing.status !== "SHIPPED" || trackingNumber !== existing.trackingNumber);

  const stockChanged = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
        ...(input.noteAdmin !== undefined && { noteAdmin: input.noteAdmin.trim() || null }),
        trackingNumber,
        trackingUrl,
        ...(input.status === "SHIPPED" &&
          existing.status !== "SHIPPED" && { shippedAt: new Date() }),
        ...(input.status === "DELIVERED" &&
          existing.status !== "DELIVERED" && { deliveredAt: new Date() }),
      },
    });
    return syncCancellation(tx, input.orderId, existing.status, input.status);
  });
  revalidatePath("/admin/zamowienia");
  revalidatePath(`/admin/zamowienia/${input.orderId}`);
  if (stockChanged) {
    // Stock and coupon use came back (or were taken again)
    updateTag("products");
    revalidatePath("/zestawy-prezentowe", "layout");
    revalidatePath("/admin/magazyn");
    revalidatePath("/admin/kupony");
  }

  if (shouldSendTrackingEmail) {
    await sendTrackingEmail(input.orderId).catch(console.error);
  }
  if (shouldSendPickupEmail) {
    await sendPickupReadyEmail(input.orderId).catch(console.error);
  }
  // Delivered (or collected in store) → ask once for a product review
  if (input.status === "DELIVERED" && existing.status !== "DELIVERED") {
    await requestOrderReview(input.orderId).catch(console.error);
  }
}

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
  revalidatePath(`/admin/zamowienia/${orderId}`);
}

export const markOrderPaid = adminActionClient
  .schema(markOrderPaidSchema)
  .action(async ({ parsedInput: { orderId } }) => {
    await applyMarkPaid(orderId);
    revalidatePath("/admin/zamowienia");
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

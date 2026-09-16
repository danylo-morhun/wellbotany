"use server";

import { revalidatePath } from "next/cache";
import { buildTrackingUrl } from "@/features/orders/lib/tracking-url";
import { ActionError } from "@/lib/action-error";
import { sendPickupReadyEmail, sendTrackingEmail } from "@/lib/email/order-emails";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { markOrderPaidSchema, updateOrderStatusSchema } from "./schema";

export const updateOrderStatus = adminActionClient
  .schema(updateOrderStatusSchema)
  .action(async ({ parsedInput: input }) => {
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

    await prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: input.status,
        ...(input.noteAdmin !== undefined && { noteAdmin: input.noteAdmin }),
        trackingNumber,
        trackingUrl,
      },
    });
    revalidatePath("/admin/zamowienia");
    revalidatePath(`/admin/zamowienia/${input.orderId}`);

    if (shouldSendTrackingEmail) {
      await sendTrackingEmail(input.orderId).catch(console.error);
    }
    if (shouldSendPickupEmail) {
      await sendPickupReadyEmail(input.orderId).catch(console.error);
    }

    return { success: true };
  });

export const markOrderPaid = adminActionClient
  .schema(markOrderPaidSchema)
  .action(async ({ parsedInput: { orderId } }) => {
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
        // Don't move an order backwards if it's already being fulfilled
        ...((existing.status === "PENDING" || existing.status === "PAYMENT_PENDING") && {
          status: "PAID",
        }),
      },
    });
    revalidatePath("/admin/zamowienia");
    revalidatePath(`/admin/zamowienia/${orderId}`);

    return { success: true };
  });

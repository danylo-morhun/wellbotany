"use server";

import { revalidatePath } from "next/cache";
import { buildTrackingUrl } from "@/features/orders/lib/tracking-url";
import { ActionError } from "@/lib/action-error";
import { sendTrackingEmail } from "@/lib/email/order-emails";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { updateOrderStatusSchema } from "./schema";

export const updateOrderStatus = adminActionClient
  .schema(updateOrderStatusSchema)
  .action(async ({ parsedInput: input }) => {
    const existing = await prisma.order.findUnique({
      where: { id: input.orderId },
      select: { status: true, trackingNumber: true, shippingMethod: true },
    });
    if (!existing) throw new ActionError("Zamówienie nie istnieje");

    const trackingNumber = input.trackingNumber?.trim() || null;
    if (input.status === "SHIPPED" && !trackingNumber) {
      throw new ActionError("Podaj numer przesyłki, aby oznaczyć zamówienie jako wysłane");
    }
    const trackingUrl = trackingNumber
      ? buildTrackingUrl(existing.shippingMethod, trackingNumber)
      : null;

    const shouldSendTrackingEmail =
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

    return { success: true };
  });

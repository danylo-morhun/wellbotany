import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { syncCancellation } from "@/features/orders/lib/cancellation";
import { buildTrackingUrl } from "@/features/orders/lib/tracking-url";
import { requestOrderReview } from "@/features/reviews/lib/request";
import { noteOrdersChanged } from "@/features/stock-sync/lib/levels-cache";
import { SUBIEKT_ORDERS_TAG } from "@/features/stock-sync/lib/orders-tag";
import { ActionError } from "@/lib/action-error";
import { sendPickupReadyEmail, sendTrackingEmail } from "@/lib/email/order-emails";
import { sendOrderCancelledEmail } from "@/lib/email/payment-reminder-emails";
import { prisma } from "@/lib/prisma";
import type { UpdateOrderStatusInput } from "../schema";

/**
 * Status change with all its side effects (stock, coupon, customer e-mails).
 * Shared by the admin actions and the shipment-tracking cron: a server action
 * expires tags with updateTag (read-your-writes), a route handler can't.
 */
export async function applyOrderStatus(
  input: UpdateOrderStatusInput,
  from: "action" | "route" = "action",
) {
  const expire = (tag: string) =>
    from === "action" ? updateTag(tag) : revalidateTag(tag, { expire: 0 });
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
        // A finished order has no open delivery problem left to chase
        ...(["DELIVERED", "CANCELLED", "REFUNDED"].includes(input.status) && {
          shipmentAlert: null,
        }),
      },
    });
    return syncCancellation(tx, input.orderId, existing.status, input.status);
  });
  revalidatePath("/admin/zamowienia");
  revalidatePath(`/admin/zamowienia/${input.orderId}`);
  expire(SUBIEKT_ORDERS_TAG);
  await noteOrdersChanged();
  if (stockChanged) {
    // Stock and coupon use came back (or were taken again)
    expire("products");
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
  // Cancelled → tell the customer (regulamin §5: withdrawal for non-payment is announced by e-mail)
  if (input.status === "CANCELLED" && existing.status !== "CANCELLED") {
    await sendOrderCancelledEmail(input.orderId).catch(console.error);
  }
  // Delivered (or collected in store) → ask once for a product review
  if (input.status === "DELIVERED" && existing.status !== "DELIVERED") {
    await requestOrderReview(input.orderId).catch(console.error);
  }
}

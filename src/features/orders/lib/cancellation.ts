import type { OrderStatus, Prisma } from "@prisma/client";
import { ActionError } from "@/lib/action-error";

/**
 * Checkout takes stock and a coupon use when the order is placed. Cancelling
 * gives both back; moving a cancelled order back to an active status takes
 * them again. REFUNDED is left alone — refunds also happen after delivery,
 * when the goods aren't back on the shelf.
 */
export async function syncCancellation(
  tx: Prisma.TransactionClient,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
): Promise<boolean> {
  const cancelling = from !== "CANCELLED" && to === "CANCELLED";
  const restoring = from === "CANCELLED" && to !== "CANCELLED";
  if (!cancelling && !restoring) return false;

  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      couponId: true,
      items: {
        select: { variantId: true, quantity: true, productName: true },
      },
    },
  });

  // Gift-set lines can repeat a variant — settle each variant once
  const perVariant = new Map<string, { quantity: number; productName: string }>();
  for (const item of order.items) {
    if (!item.variantId) continue; // variant deleted since — nothing to put back
    const prev = perVariant.get(item.variantId);
    perVariant.set(item.variantId, {
      quantity: (prev?.quantity ?? 0) + item.quantity,
      productName: item.productName,
    });
  }

  for (const [variantId, { quantity, productName }] of perVariant) {
    if (cancelling) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: quantity } },
      });
    } else {
      const taken = await tx.productVariant.updateMany({
        where: { id: variantId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (taken.count === 0) {
        throw new ActionError(
          `Za mało towaru, aby przywrócić zamówienie: ${productName} (potrzeba ${quantity} szt.)`,
        );
      }
    }
  }

  if (order.couponId) {
    await tx.coupon.updateMany({
      where: { id: order.couponId, ...(cancelling && { usageCount: { gt: 0 } }) },
      data: { usageCount: cancelling ? { decrement: 1 } : { increment: 1 } },
    });
  }
  return true;
}

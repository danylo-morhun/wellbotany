import { randomBytes } from "node:crypto";
import { sendReviewRequestEmail } from "@/lib/email/order-emails";
import { prisma } from "@/lib/prisma";

/**
 * Creates the order's review link (once) and emails it. Returns false when
 * the order isn't in a reviewable state or was already asked.
 */
export async function requestOrderReview(
  orderId: string,
  { force = false } = {},
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, reviewToken: true, reviewRequestedAt: true },
  });
  if (!order || !["SHIPPED", "DELIVERED"].includes(order.status)) return false;
  if (order.reviewRequestedAt && !force) return false;

  const token = order.reviewToken ?? randomBytes(24).toString("hex");
  await prisma.order.update({
    where: { id: orderId },
    data: { reviewToken: token, reviewRequestedAt: new Date() },
  });
  await sendReviewRequestEmail(orderId);
  return true;
}

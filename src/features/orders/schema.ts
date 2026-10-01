import { OrderStatus } from "@prisma/client";
import { z } from "zod";

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.nativeEnum(OrderStatus),
  noteAdmin: z.string().max(1000).optional(),
  trackingNumber: z.string().max(100).optional(),
});

export const markOrderPaidSchema = z.object({ orderId: z.string().min(1) });

/** Bulk changes skip SHIPPED for courier orders — those need a tracking number each. */
export const BULK_ORDER_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export const bulkUpdateOrderStatusSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(BULK_ORDER_STATUSES),
});

export const bulkMarkOrdersPaidSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(100),
});

export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;

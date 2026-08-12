import { OrderStatus } from "@prisma/client";
import { z } from "zod";

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.nativeEnum(OrderStatus),
  noteAdmin: z.string().max(1000).optional(),
  trackingNumber: z.string().max(100).optional(),
});

export type UpdateOrderStatusInput = z.input<typeof updateOrderStatusSchema>;

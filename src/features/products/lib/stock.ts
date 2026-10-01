import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** "Niski stan" exactly as the Magazyn tab counts it: per-variant threshold, active tracked variants */
export const lowStockWhere: Prisma.ProductVariantWhereInput = {
  isActive: true,
  trackStock: true,
  stock: { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold },
};

import type { CouponType } from "@prisma/client";

type CouponTerms = { type: CouponType; value: number; excludeSaleItems: boolean };

export const SALE_ITEMS_ONLY_MESSAGE =
  "Kod nie łączy się z promocjami, a w koszyku są tylko produkty w promocji";

/**
 * Coupon discount in grosz. `saleSubtotalPln` is the part of the subtotal
 * already on sale — left out when the coupon doesn't stack with promotions.
 */
export function couponDiscountPln(
  coupon: CouponTerms,
  subtotalPln: number,
  saleSubtotalPln: number,
): number {
  const base = coupon.excludeSaleItems ? subtotalPln - saleSubtotalPln : subtotalPln;
  if (base <= 0) return 0;
  return coupon.type === "PERCENTAGE"
    ? Math.round((base * coupon.value) / 100)
    : Math.min(coupon.value, base);
}

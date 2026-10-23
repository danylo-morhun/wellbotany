import { describe, expect, it } from "vitest";
import { saleSubtotalPln } from "@/features/cart/lib/pricing";
import { couponDiscountPln } from "@/features/coupons/lib/discount";

describe("saleSubtotalPln", () => {
  const line = (
    pricePln: number,
    comparePricePln: number | null,
    lowestPrice30dPln: number | null,
    quantity = 1,
  ) => ({
    quantity,
    unitPriceOverridePln: null,
    variant: { pricePln, comparePricePln, lowestPrice30dPln },
    giftSet: null,
  });

  it("counts only lines the storefront shows as reduced", () => {
    const items = [
      line(8000, 10000, 10000, 2),
      line(5000, null, null),
      // compare price set, but it was this cheap within 30 days — not a promotion
      line(5000, 6000, 5000),
    ];
    expect(saleSubtotalPln(items)).toBe(16000);
  });

  it("follows the curated gift set, not the component variant", () => {
    const setLine = (comparePricePln: number | null) => ({
      quantity: 1,
      unitPriceOverridePln: 3000,
      variant: { pricePln: 4000, comparePricePln: 5000, lowestPrice30dPln: 5000 },
      giftSet: { pricePln: 9000, comparePricePln, lowestPrice30dPln: comparePricePln },
    });
    expect(saleSubtotalPln([setLine(12000)])).toBe(3000);
    expect(saleSubtotalPln([setLine(null)])).toBe(0);
  });
});

describe("couponDiscountPln", () => {
  const pct10 = { type: "PERCENTAGE" as const, value: 10 };

  it("leaves sale lines out when the coupon doesn't stack", () => {
    expect(couponDiscountPln({ ...pct10, excludeSaleItems: true }, 30000, 20000)).toBe(1000);
  });

  it("discounts the whole subtotal when stacking is allowed", () => {
    expect(couponDiscountPln({ ...pct10, excludeSaleItems: false }, 30000, 20000)).toBe(3000);
  });

  it("caps a fixed amount at the eligible part", () => {
    const fixed = { type: "FIXED_AMOUNT" as const, value: 5000, excludeSaleItems: true };
    expect(couponDiscountPln(fixed, 30000, 27000)).toBe(3000);
  });

  it("gives nothing when every line is on sale", () => {
    expect(couponDiscountPln({ ...pct10, excludeSaleItems: true }, 20000, 20000)).toBe(0);
  });
});

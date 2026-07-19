import { describe, expect, it } from "vitest";
import {
  allocateGiftBoxPrice,
  type GiftBuilderComponent,
  type GiftBuilderPolicy,
  giftBuilderTargetTotalPln,
} from "@/features/gift-sets/lib/pricing";

describe("giftBuilderTargetTotalPln", () => {
  const components: GiftBuilderComponent[] = [
    { variantId: "a", quantity: 1, unitPricePln: 2000 },
    { variantId: "b", quantity: 2, unitPricePln: 1500 },
  ];

  it("returns the fixed box price for FIXED_BOX mode, ignoring components", () => {
    const policy: GiftBuilderPolicy = {
      pricingMode: "FIXED_BOX",
      boxPricePln: 9900,
      discountPercent: 0,
      minItems: 1,
      maxItems: 10,
    };
    expect(giftBuilderTargetTotalPln(policy, components)).toBe(9900);
  });

  it("discounts the component sum for SUM_PLUS_FEE with a positive discountPercent", () => {
    const policy: GiftBuilderPolicy = {
      pricingMode: "SUM_PLUS_FEE",
      boxPricePln: null,
      discountPercent: 10,
      minItems: 1,
      maxItems: 10,
    };
    // sum = 2000*1 + 1500*2 = 5000; 10% off -> 4500
    expect(giftBuilderTargetTotalPln(policy, components)).toBe(4500);
  });

  it("marks the sum up when discountPercent is negative", () => {
    const policy: GiftBuilderPolicy = {
      pricingMode: "SUM_PLUS_FEE",
      boxPricePln: null,
      discountPercent: -10,
      minItems: 1,
      maxItems: 10,
    };
    // sum = 5000; -10% -> 110% -> 5500
    expect(giftBuilderTargetTotalPln(policy, components)).toBe(5500);
  });
});

describe("allocateGiftBoxPrice", () => {
  it("splits the target total across components weighted by price, exactly, when it divides evenly", () => {
    const components: GiftBuilderComponent[] = [
      { variantId: "a", quantity: 1, unitPricePln: 3300 },
      { variantId: "b", quantity: 1, unitPricePln: 3300 },
      { variantId: "c", quantity: 1, unitPricePln: 3400 },
    ];

    const { lines, totalPln } = allocateGiftBoxPrice(components, 10000);

    expect(totalPln).toBe(10000);
    expect(lines.map((l) => l.lineTotalPln)).toEqual([3300, 3300, 3400]);
  });

  it("returns totalPln as the sum of rounded lines, not the nominal target, when rounding drifts", () => {
    // weights 33/33/34 of a target that doesn't split evenly -> each line
    // rounds down from its exact share, so the rounded sum undershoots the
    // nominal target by a few grosz.
    const components: GiftBuilderComponent[] = [
      { variantId: "a", quantity: 1, unitPricePln: 33 },
      { variantId: "b", quantity: 1, unitPricePln: 33 },
      { variantId: "c", quantity: 1, unitPricePln: 34 },
    ];
    const target = 101;

    const { lines, totalPln } = allocateGiftBoxPrice(components, target);

    const actualSum = lines.reduce((s, l) => s + l.lineTotalPln, 0);
    expect(totalPln).toBe(actualSum);
    expect(totalPln).not.toBe(target);
    expect(totalPln).toBe(100);
  });

  it("multiplies the rounded per-unit price by quantity for each line", () => {
    const components: GiftBuilderComponent[] = [
      { variantId: "a", quantity: 3, unitPricePln: 1000 },
      { variantId: "b", quantity: 1, unitPricePln: 1000 },
    ];

    const { lines, totalPln } = allocateGiftBoxPrice(components, 4000);

    const line = lines.find((l) => l.variantId === "a");
    expect(line?.lineTotalPln).toBe(line ? line.unitPriceOverridePln * 3 : NaN);
    expect(totalPln).toBe(lines.reduce((s, l) => s + l.lineTotalPln, 0));
  });

  it("falls back to an even split across components when weights sum to zero", () => {
    const components: GiftBuilderComponent[] = [
      { variantId: "a", quantity: 1, unitPricePln: 0 },
      { variantId: "b", quantity: 1, unitPricePln: 0 },
    ];

    const { lines, totalPln } = allocateGiftBoxPrice(components, 1000);

    expect(lines.map((l) => l.lineTotalPln)).toEqual([500, 500]);
    expect(totalPln).toBe(1000);
  });
});

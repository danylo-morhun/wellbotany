import { describe, expect, it } from "vitest";
import { netPricePln, variantMargin } from "@/features/products/lib/margin";

describe("variantMargin", () => {
  it("takes VAT off the price before comparing with cost", () => {
    expect(netPricePln(10800, 8)).toBe(10000);
    expect(variantMargin(10800, 7000, 8)).toEqual({
      marginPln: 3000,
      percent: 30,
      // 108 zł of conversion value per 30 zł of margin
      breakEvenRoas: 3.6,
    });
  });

  it("has no break-even ROAS when the variant loses money", () => {
    expect(variantMargin(6249, 6897, 8)).toMatchObject({ breakEvenRoas: null });
    expect(variantMargin(6249, 6897, 8)?.percent).toBeLessThan(0);
  });

  it("is null without a cost", () => {
    expect(variantMargin(5000, 0, 23)).toBeNull();
  });
});

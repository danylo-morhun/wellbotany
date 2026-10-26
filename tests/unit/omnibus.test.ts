import { describe, expect, it } from "vitest";
import { discountPercent, omnibusNote, referencePrice } from "@/lib/omnibus";

describe("omnibusNote", () => {
  it("describes the lowest price before a reduction", () => {
    expect(omnibusNote({ pricePln: 3990, comparePricePln: 4990, lowestPrice30dPln: 4590 })).toMatch(
      /^Najniższa cena z 30 dni przed obniżką: 45,90/,
    );
  });

  it("is null without a reduction", () => {
    expect(omnibusNote({ pricePln: 3990, comparePricePln: null, lowestPrice30dPln: null })).toBe(
      null,
    );
    expect(omnibusNote({ pricePln: 3990, comparePricePln: 3990, lowestPrice30dPln: 3990 })).toBe(
      null,
    );
  });

  it("is null when the price was already this low in the last 30 days", () => {
    expect(omnibusNote({ pricePln: 3990, comparePricePln: 4990, lowestPrice30dPln: 3990 })).toBe(
      null,
    );
  });
});

describe("discountPercent", () => {
  it("measures the cut against the 30-day low, not the regular price", () => {
    // UOKiK example: regular 200 zł, 30-day low 125 zł, now 100 zł → -20%, not -50%
    expect(
      discountPercent({ pricePln: 10000, comparePricePln: 20000, lowestPrice30dPln: 12500 }),
    ).toBe(20);
  });

  it("is null without a real reduction", () => {
    expect(
      discountPercent({ pricePln: 8000, comparePricePln: 10000, lowestPrice30dPln: 7500 }),
    ).toBe(null);
    expect(
      discountPercent({ pricePln: 8000, comparePricePln: 10000, lowestPrice30dPln: null }),
    ).toBe(null);
    expect(
      discountPercent({ pricePln: 8000, comparePricePln: null, lowestPrice30dPln: 10000 }),
    ).toBe(null);
  });
});

describe("referencePrice", () => {
  it("strikes the 30-day low the percent is measured from, not the regular price", () => {
    expect(
      referencePrice({ pricePln: 10000, comparePricePln: 20000, lowestPrice30dPln: 12500 }),
    ).toBe(12500);
  });

  it("is null without a real reduction", () => {
    expect(
      referencePrice({ pricePln: 8000, comparePricePln: 10000, lowestPrice30dPln: 7500 }),
    ).toBe(null);
    expect(
      referencePrice({ pricePln: 8000, comparePricePln: null, lowestPrice30dPln: 10000 }),
    ).toBe(null);
  });
});

import { describe, expect, it } from "vitest";
import {
  cartDiscount,
  isTierPromoLive,
  nextTier,
  parseTiers,
  pickDiscount,
  tierDiscountPln,
} from "@/features/promotions/lib/tiered";

const tiers = parseTiers([
  { minPln: 25000, percent: 10 },
  { minPln: 15000, percent: 5 },
]);

describe("tiered discount", () => {
  it("sorts tiers and drops malformed JSON", () => {
    expect(tiers.map((t) => t.percent)).toEqual([5, 10]);
    expect(parseTiers([{ minPln: "x" }])).toEqual([]);
    expect(parseTiers(null)).toEqual([]);
  });

  it("applies the highest reached tier to lines not on sale", () => {
    expect(tierDiscountPln(tiers, 14999, 0)).toEqual({ discountPln: 0, percent: 0 });
    expect(tierDiscountPln(tiers, 15000, 0)).toEqual({ discountPln: 750, percent: 5 });
    // threshold counts the whole cart, discount skips the 10000 already on sale
    expect(tierDiscountPln(tiers, 30000, 10000)).toEqual({ discountPln: 2000, percent: 10 });
    expect(tierDiscountPln(tiers, 30000, 30000).discountPln).toBe(0);
  });

  it("says how much is missing for the next tier", () => {
    expect(nextTier(tiers, 10000)).toEqual({ tier: tiers[0], missingPln: 5000 });
    expect(nextTier(tiers, 20000)).toEqual({ tier: tiers[1], missingPln: 5000 });
    expect(nextTier(tiers, 25000)).toBeNull();
  });

  it("is live only inside its dates", () => {
    const promo = {
      name: "BW",
      tiers,
      startsAt: "2026-11-24T00:00:00.000Z",
      endsAt: "2026-11-30T23:00:00.000Z",
    };
    expect(isTierPromoLive(promo, new Date("2026-11-23T12:00:00Z"))).toBe(false);
    expect(isTierPromoLive(promo, new Date("2026-11-27T12:00:00Z"))).toBe(true);
    expect(isTierPromoLive(promo, new Date("2026-12-01T00:00:00Z"))).toBe(false);
    expect(isTierPromoLive({ ...promo, tiers: [] }, new Date("2026-11-27T12:00:00Z"))).toBe(false);
  });

  it("never stacks with a coupon — the bigger one wins", () => {
    expect(pickDiscount(1000, 750)).toBe("coupon");
    expect(pickDiscount(500, 750)).toBe("promo");
    expect(pickDiscount(0, 0)).toBeNull();
  });
});

describe("cartDiscount", () => {
  const promo = { name: "Black Week", tiers, startsAt: null, endsAt: null };

  it("uses the promotion when it beats the coupon and says the code is unused", () => {
    const d = cartDiscount(promo, 30000, 0, 1000);
    expect(d).toMatchObject({ discountPln: 3000, source: "promo" });
    expect(d.note).toContain("kod nie zostanie użyty");
  });

  it("uses the coupon when it beats the promotion", () => {
    const d = cartDiscount(promo, 15000, 0, 2000);
    expect(d).toMatchObject({ discountPln: 2000, source: "coupon" });
    expect(d.note).toContain("nie sumują");
  });

  it("is zero without coupon or reached tier", () => {
    expect(cartDiscount(promo, 1000, 0, 0)).toEqual({ discountPln: 0, source: null, note: null });
    expect(cartDiscount(null, 30000, 0, 0).discountPln).toBe(0);
  });
});

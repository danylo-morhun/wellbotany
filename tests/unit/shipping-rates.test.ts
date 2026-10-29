import { describe, expect, it } from "vitest";
import {
  cheapestPaidRate,
  deliveryEstimate,
  isPointService,
  orderTotals,
  requiresAddress,
  shippingCostFor,
  sortRates,
} from "@/features/checkout/lib/shipping";

const rates = [
  { method: "PICKUP" as const, pricePln: 0 },
  { method: "INPOST_KURIER" as const, pricePln: 1699 },
  { method: "ORLEN_PACZKA" as const, pricePln: 1199 },
  { method: "DPD_PICKUP" as const, pricePln: 1299 },
];

describe("shipping rates", () => {
  it("sorts cheapest first, in-store pickup last", () => {
    expect(sortRates(rates).map((r) => r.method)).toEqual([
      "ORLEN_PACZKA",
      "DPD_PICKUP",
      "INPOST_KURIER",
      "PICKUP",
    ]);
  });

  it("finds the cheapest paid rate per delivery kind", () => {
    expect(cheapestPaidRate(rates)).toBe(1199);
    expect(cheapestPaidRate(rates, "door")).toBe(1699);
    expect(cheapestPaidRate([{ method: "PICKUP", pricePln: 0 }])).toBeNull();
  });

  it("is free from the threshold", () => {
    expect(shippingCostFor(1299, 20000, 20000)).toBe(0);
    expect(shippingCostFor(1299, 19999, 20000)).toBe(1299);
    expect(shippingCostFor(1299, 99999, null)).toBe(1299);
  });

  it("knows which methods need a point or an address", () => {
    expect(isPointService("DHL_POINT")).toBe(true);
    expect(isPointService("DHL")).toBe(false);
    expect(isPointService("inpost")).toBe(false);
    expect(requiresAddress("GLS")).toBe(true);
    expect(requiresAddress("PICKUP")).toBe(false);
  });
});

describe("orderTotals", () => {
  it("checks the free threshold against the subtotal after discount", () => {
    // 210 zł − 20 zł code = 190 zł → below 200 zł, delivery is charged
    expect(orderTotals(21000, 2000, 1299, 20000)).toEqual({
      productsPln: 19000,
      shippingPln: 1299,
      totalPln: 20299,
    });
    expect(orderTotals(21000, 0, 1299, 20000)).toEqual({
      productsPln: 21000,
      shippingPln: 0,
      totalPln: 21000,
    });
  });

  it("always charges delivery when the threshold is off", () => {
    expect(orderTotals(99900, 0, 1299, null).shippingPln).toBe(1299);
  });
});

describe("deliveryEstimate", () => {
  it("is free once the threshold is met, else from the cheapest paid rate", () => {
    expect(deliveryEstimate(20000, 20000, 1299)).toEqual({ free: true });
    expect(deliveryEstimate(19999, 20000, 1299)).toEqual({ free: false, fromPln: 1299 });
    expect(deliveryEstimate(19999, 20000, null)).toEqual({ free: false, fromPln: null });
  });
});

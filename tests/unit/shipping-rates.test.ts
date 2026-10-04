import { describe, expect, it } from "vitest";
import {
  cheapestPaidRate,
  isPointService,
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

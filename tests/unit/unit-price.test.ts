import { describe, expect, it } from "vitest";
import {
  feedUnitPricing,
  formatUnitPrice,
  parsePackQuantity,
  variantPackQuantity,
} from "@/lib/unit-price";

describe("parsePackQuantity", () => {
  it.each([
    ["60 kaps.", { value: 60, unit: "ct" }],
    ["120 kapsułek", { value: 120, unit: "ct" }],
    ["90 tabl.", { value: 90, unit: "ct" }],
    ["120 tabletek", { value: 120, unit: "ct" }],
    ["1\u00a0200 g", { value: 1200, unit: "g" }],
    ["20 saszetek", { value: 20, unit: "ct" }],
    ["60 żelek", { value: 60, unit: "ct" }],
    ["300 g", { value: 300, unit: "g" }],
    ["250g", { value: 250, unit: "g" }],
    ["1 kg", { value: 1000, unit: "g" }],
    ["0,5 l", { value: 500, unit: "ml" }],
    ["500 ml", { value: 500, unit: "ml" }],
    ["1 000 ml", { value: 1000, unit: "ml" }],
    ["2x 60 kaps.", { value: 120, unit: "ct" }],
    ["300 g (30 sasz. x 10 g)", { value: 300, unit: "g" }],
    ["60 kaps. (36 g)", { value: 60, unit: "ct" }],
    ["300 g.", { value: 300, unit: "g" }],
    ["60 kaps,", { value: 60, unit: "ct" }],
    ["Słoik (60 g)", { value: 60, unit: "g" }],
    ["250 g – ok. 30 porcji - 1,50 zł za filiżankę", { value: 250, unit: "g" }],
  ])("%s", (raw, expected) => {
    expect(parsePackQuantity(raw)).toEqual(expected);
  });

  it.each([
    null,
    "",
    "Słoik",
    "30 porcji",
    "1500 kropli",
    "250 g / 500 g",
    "60 kaps. + 30 sasz.",
    "5 gwiazdek",
    "66 g, 90 tabletek",
    "2x 60 kaps 1x 30 kaps",
  ])("rejects %s", (raw) => {
    expect(parsePackQuantity(raw)).toBeNull();
  });
});

describe("variantPackQuantity", () => {
  it("falls back to netWeight only for a single variant", () => {
    expect(variantPackQuantity(null, "60 kaps.", true)).toEqual({ value: 60, unit: "ct" });
    expect(variantPackQuantity(null, "60 kaps.", false)).toBeNull();
    expect(variantPackQuantity("120 kaps.", "60 kaps.", false)).toEqual({ value: 120, unit: "ct" });
  });

  it("prefers the piece count closing the name over capsule mass", () => {
    expect(variantPackQuantity(null, "18,8 g", true, "Witamina B2 40 mg – 60 kaps.")).toEqual({
      value: 60,
      unit: "ct",
    });
    expect(variantPackQuantity(null, "300 g", true, "Kreatyna – 300 g")).toEqual({
      value: 300,
      unit: "g",
    });
  });
});

describe("formatUnitPrice", () => {
  it("per piece, kg and litre", () => {
    expect(formatUnitPrice(4990, { value: 60, unit: "ct" })).toMatch(/^0,83\s?zł \/ szt\.$/);
    expect(formatUnitPrice(4990, { value: 300, unit: "g" })).toMatch(/^166,33\s?zł \/ kg$/);
    expect(formatUnitPrice(4990, { value: 500, unit: "ml" })).toMatch(/^99,80\s?zł \/ l$/);
  });

  it("skips a single piece and unknown quantity", () => {
    expect(formatUnitPrice(4990, { value: 1, unit: "ct" })).toBeNull();
    expect(formatUnitPrice(4990, null)).toBeNull();
  });
});

describe("feedUnitPricing", () => {
  it("uses Merchant Center units", () => {
    expect(feedUnitPricing({ value: 60, unit: "ct" })).toEqual({ measure: "60ct", base: "1ct" });
    expect(feedUnitPricing({ value: 300, unit: "g" })).toEqual({ measure: "300g", base: "1kg" });
    expect(feedUnitPricing({ value: 500, unit: "ml" })).toEqual({ measure: "500ml", base: "1l" });
  });
});

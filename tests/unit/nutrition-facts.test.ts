import { describe, expect, it } from "vitest";
import {
  nutritionFactsToText,
  parseNutritionFactsText,
  readNutritionFacts,
} from "@/features/products/lib/nutrition-facts";

describe("nutrition facts", () => {
  it("reads imported free text ({ pl }) without crashing", () => {
    expect(readNutritionFacts({ pl: "Witamina C - 500 mg" })).toEqual({
      rows: [],
      text: "Witamina C - 500 mg",
    });
    expect(readNutritionFacts(null)).toEqual({ rows: [], text: null });
  });

  it("round-trips structured rows through the admin textarea", () => {
    const rows = [{ name: "Cynk", amount: "10 mg", rws: "100%" }];
    const text = nutritionFactsToText(readNutritionFacts(rows));
    expect(text).toBe("Cynk | 10 mg | 100%");
    expect(parseNutritionFactsText(text)).toEqual(rows);
  });

  it("keeps free text as-is instead of dropping it on save", () => {
    const text = "zalecana porcja dzienna (2 kapsułki) zawiera:\nWitamina C - 500 mg";
    expect(parseNutritionFactsText(text)).toEqual({ pl: text });
  });
});

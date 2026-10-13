import { describe, expect, it } from "vitest";
import {
  nutritionFactsToText,
  parseNutritionFactsText,
  parseNutritionLabel,
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

describe("parseNutritionLabel", () => {
  it("turns a food label into rows", () => {
    const label = parseNutritionLabel(
      [
        "WARTOŚĆ ODŻYWCZA W 100 g",
        "Wartość energetyczna: 2146 kJ/513 kcal",
        "Tłuszcz - 25 g",
        "w tym kwasy tłuszczowe nasycone 23 g",
        "Sól: <0,01 g",
        "Potas: 97 mg (4,9 %)**",
        "**dzienna referencyjna wartość spożycia",
      ].join("\n"),
    );
    expect(label).toEqual({
      basis: "100 g",
      rows: [
        { name: "Wartość energetyczna", amount: "2146 kJ/513 kcal", rws: undefined },
        { name: "Tłuszcz", amount: "25 g", rws: undefined },
        { name: "w tym kwasy tłuszczowe nasycone", amount: "23 g", rws: undefined },
        { name: "Sól", amount: "<0,01 g", rws: undefined },
        { name: "Potas", amount: "97 mg", rws: "4,9%" },
      ],
      notes: ["**dzienna referencyjna wartość spożycia"],
    });
  });

  it("leaves supplement text and multi-table labels alone", () => {
    expect(parseNutritionLabel("Witamina C 80 mg 100%")).toBeNull();
    expect(
      parseNutritionLabel(
        "WARTOŚĆ ODŻYWCZA w 100 g\nTłuszcz: 1 g\nWARTOŚĆ ODŻYWCZA w 100 g wiśnia:\nTłuszcz: 2 g",
      ),
    ).toBeNull();
  });
});

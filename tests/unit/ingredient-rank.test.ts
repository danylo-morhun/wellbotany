import { describe, expect, it } from "vitest";
import { rankIngredientsByProducts } from "@/features/catalog/lib/ingredient-rank";

const ingredient = (slug: string, matchTerms: string[], excludeTerms: string[] = []) => ({
  slug,
  namePl: slug,
  matchTerms,
  excludeTerms,
});

describe("rankIngredientsByProducts", () => {
  const names = [
    "Magnez + B6",
    "Cytrynian MAGNEZU 120 kaps.",
    "Witamina D3 2000 IU",
    "Witamina D3 + K2",
    "Witamina K2 MK-7",
    "Olej z czarnuszki",
  ];

  it("orders by matching products and drops empty ones", () => {
    const result = rankIngredientsByProducts(
      [
        ingredient("witamina-d", ["witamina d"]),
        ingredient("magnez", ["magnez"]),
        ingredient("cynk", ["cynk"]),
      ],
      names,
      8,
    );
    expect(result.map((r) => [r.slug, r.productCount])).toEqual([
      ["magnez", 2],
      ["witamina-d", 2],
    ]);
  });

  it("honours exclude terms and the limit", () => {
    const result = rankIngredientsByProducts(
      [ingredient("witamina-k2", ["k2"], ["d3"]), ingredient("magnez", ["magnez"])],
      names,
      1,
    );
    expect(result).toEqual([{ slug: "magnez", namePl: "magnez", productCount: 2 }]);
    expect(
      rankIngredientsByProducts([ingredient("witamina-k2", ["k2"], ["d3"])], names, 8)[0]
        .productCount,
    ).toBe(1);
  });
});

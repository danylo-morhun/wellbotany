import { describe, expect, it } from "vitest";
import { cardMetaLine, keyIngredientRows } from "@/features/catalog/lib/product-facts";

describe("keyIngredientRows", () => {
  it("takes the first three top-level rows", () => {
    const rows = [
      { name: "Magnez", amount: "100 mg", rws: "27%" },
      { name: "w tym jony", amount: "50 mg" },
      { name: "Witamina B6", amount: "1,4 mg", rws: "100%" },
      { name: "Cynk", amount: "10 mg" },
      { name: "Selen", amount: "55 µg" },
    ];
    expect(keyIngredientRows(rows).map((r) => r.name)).toEqual(["Magnez", "Witamina B6", "Cynk"]);
  });

  it("returns nothing for no rows", () => {
    expect(keyIngredientRows([])).toEqual([]);
  });
});

describe("cardMetaLine", () => {
  it("joins pack size and serving", () => {
    expect(
      cardMetaLine({ namePl: "BestBiotic", netWeight: "60 kaps.", servingSize: "1 dziennie" }),
    ).toBe("60 kaps. · 1 dziennie");
  });

  it("drops the pack size already in the name", () => {
    expect(cardMetaLine({ namePl: "Magnez – 60 kaps.", netWeight: "60 kaps" })).toBeNull();
    expect(
      cardMetaLine({ namePl: "Magnez – 60 kaps.", netWeight: "60 kaps.", servingSize: "2 kaps." }),
    ).toBe("2 kaps.");
  });

  it("is null without data", () => {
    expect(cardMetaLine({ namePl: "X", netWeight: null, servingSize: " " })).toBeNull();
  });
});

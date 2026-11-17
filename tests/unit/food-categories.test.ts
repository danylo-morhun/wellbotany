import { describe, expect, it } from "vitest";
import { foodProductCount, foodSubcategories } from "@/features/catalog/lib/food";

const cat = (id: string, slug: string, parentId: string | null, productCount: number) => ({
  id,
  slug,
  parentId,
  productCount,
});

// productCount counts the whole subtree, as getCategories does
const before = [
  cat("f", "zywnosc", null, 350),
  cat("b", "batony", "f", 61),
  cat("c", "czekolady-i-czekoladki", null, 148),
  cat("m", "magnez", null, 90),
];
const after = [
  cat("f", "zywnosc", null, 498),
  cat("b", "batony", "f", 61),
  cat("c", "czekolady-i-czekoladki", "f", 148),
  cat("m", "magnez", null, 90),
];

describe("food categories", () => {
  it("adds chocolate while it is a root of its own", () => {
    expect(foodProductCount(before)).toBe(498);
    expect(foodSubcategories(before).map((c) => c.slug)).toEqual([
      "batony",
      "czekolady-i-czekoladki",
    ]);
  });

  it("counts chocolate once after it moves under zywnosc", () => {
    expect(foodProductCount(after)).toBe(498);
    expect(foodSubcategories(after).map((c) => c.slug)).toEqual([
      "batony",
      "czekolady-i-czekoladki",
    ]);
  });

  it("handles a shop without a food tree", () => {
    expect(foodProductCount([])).toBe(0);
    expect(foodSubcategories([cat("c", "czekolady-i-czekoladki", null, 5)])).toHaveLength(1);
  });
});

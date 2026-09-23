import { describe, expect, it } from "vitest";
import { nameTokens, type RelatedCandidate, rankRelated } from "@/features/catalog/lib/related";

const base = {
  categoryId: "vit",
  categoryParentId: "root",
  brandId: "kenay",
  brandParentId: null,
  brandName: "Kenay",
  hasImage: true,
  inStock: true,
};
const seed = { id: "s", namePl: "Magnez + B6 x 60 kaps.", ...base };

function candidate(id: string, namePl: string, extra: Partial<RelatedCandidate> = {}) {
  return { id, namePl, ...base, ...extra };
}

describe("nameTokens", () => {
  it("keeps ingredient words and vitamin codes, drops pack words and diacritics", () => {
    expect([...nameTokens("Witamina K2 MK-7 z Natto 60 kapsułek")]).toEqual([
      "witamina-k2",
      "k2",
      "natto",
    ]);
    expect(nameTokens("Miedź MSE dr Enzmann").has("miedz")).toBe(true);
  });
});

describe("rankRelated", () => {
  it("does not treat different vitamins as similar", () => {
    const ids = rankRelated(
      { ...seed, namePl: "Witamina C 1000 mg" },
      [candidate("d3", "Witamina D3 2000 IU"), candidate("c", "Witamina C liposomalna")],
      2,
    );
    expect(ids[0]).toBe("c");
  });

  it("prefers a shared ingredient over a same-category stranger", () => {
    const ids = rankRelated(
      seed,
      [
        candidate("other", "Kolagen morski", { brandId: "x" }),
        candidate("mag", "Magnez cytrynian", { categoryId: "min", brandId: "x" }),
      ],
      2,
    );
    expect(ids[0]).toBe("mag");
  });

  it("shows at most one other pack size of the same product", () => {
    const ids = rankRelated(
      seed,
      [
        candidate("a", "Magnez + B6 x 120 kaps."),
        candidate("b", "Magnez + B6 x 180 kaps."),
        candidate("c", "Cynk chelat"),
      ],
      3,
    );
    expect(ids.filter((id) => id === "a" || id === "b")).toHaveLength(1);
    expect(ids).toContain("c");
  });

  it("pushes products without a photo down", () => {
    const ids = rankRelated(
      seed,
      [candidate("noimg", "Magnez chelat", { hasImage: false }), candidate("img", "Cynk chelat")],
      2,
    );
    expect(ids).toEqual(["img", "noimg"]);
  });
});

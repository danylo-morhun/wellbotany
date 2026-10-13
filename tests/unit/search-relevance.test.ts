import { describe, expect, it } from "vitest";
import { rankBySearchRelevance } from "@/features/catalog/lib/search-relevance";

const names = (items: { namePl: string }[]) => items.map((i) => i.namePl);

describe("rankBySearchRelevance", () => {
  const items = [
    { namePl: "Cynk 15 mg", slug: "cynk-15-mg" },
    { namePl: "Liposomalny Cynk", slug: "liposomalny-cynk" },
    { namePl: "Witamina C", slug: "witamina-c" },
  ];

  it("finds a word later in the product name", () => {
    expect(names(rankBySearchRelevance(items, "cynk"))).toEqual(
      expect.arrayContaining(["Cynk 15 mg", "Liposomalny Cynk"]),
    );
  });

  it("matches case-insensitively", () => {
    expect(names(rankBySearchRelevance(items, "CYNK"))).toContain("Liposomalny Cynk");
  });

  it("still tolerates typos at the start", () => {
    expect(names(rankBySearchRelevance(items, "witamna"))).toContain("Witamina C");
  });

  it("drops unrelated products", () => {
    expect(names(rankBySearchRelevance(items, "cynk"))).not.toContain("Witamina C");
  });
});

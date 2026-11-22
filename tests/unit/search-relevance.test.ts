import { describe, expect, it } from "vitest";
import { rankBySearchRelevance } from "@/features/catalog/lib/search-relevance";

const jacob = { name: "Dr. Jacob's" };
const items = [
  { namePl: "Witamina B12 forte 100 µg – 20 ml", slug: "witamina-b12-forte", brand: jacob },
  { namePl: "Witamina D3 Junior 20 µg – 20 ml", slug: "witamina-d3-junior", brand: jacob },
  { namePl: "Sól niskosodowa", slug: "sol-niskosodowa", brand: jacob },
  { namePl: "Witamina C 1000 mg", slug: "witamina-c-1000", brand: { name: "BestLab" } },
];

const names = (q: string) => rankBySearchRelevance(items, q).map((p) => p.namePl);

describe("rankBySearchRelevance", () => {
  it("matches brand + name words across fields", () => {
    for (const q of ["Dr. Jacob s Witamina", "Dr. Jacob's Witamina", "dr jacobs witamina"]) {
      const result = names(q);
      expect(result).toContain("Witamina B12 forte 100 µg – 20 ml");
      expect(result).toContain("Witamina D3 Junior 20 µg – 20 ml");
      expect(result).not.toContain("Witamina C 1000 mg");
      expect(result).not.toContain("Sól niskosodowa");
    }
  });

  it("ignores diacritics and word order", () => {
    expect(names("sol jacob")).toEqual(["Sól niskosodowa"]);
    expect(names("d3 witamina")).toContain("Witamina D3 Junior 20 µg – 20 ml");
  });
});

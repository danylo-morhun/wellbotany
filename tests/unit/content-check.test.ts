import { describe, expect, it } from "vitest";
import { checkProduct, isValidGtin, quantities } from "../../scripts/content-pass/lib/check";

describe("quantities", () => {
  it("normalizes spacing, decimal commas and unit spellings", () => {
    expect(quantities("2 000 IU, 0,5 g i 200 mcg – 60 kapsułek")).toEqual([
      "2000 iu",
      "0.5 g",
      "200 µg",
      "60 kaps",
    ]);
  });
});

describe("isValidGtin", () => {
  it("checks the check digit", () => {
    expect(isValidGtin("5901234123457")).toBe(true);
    expect(isValidGtin("5901234123458")).toBe(false);
    expect(isValidGtin("036000291452")).toBe(true);
  });
});

describe("quantities edge cases", () => {
  it("keeps letter-glued digits apart and reads CFU notations", () => {
    expect(quantities("MagneMe B6 120 kaps., D3 800 IU")).toEqual(["120 kaps", "800 iu"]);
    expect(quantities("2,6×10⁹ CFU i 2 miliardy")).toEqual(["2.6 mld", "2 mld"]);
  });
});

describe("checkProduct", () => {
  const cats = new Set(["magnez", "na-sen"]);
  it("flags numbers missing from sources, banned words, bad tags and slugs", () => {
    const problems = checkProduct(
      {
        id: "p",
        namePl: "Magnez 300 mg – 120 kaps.",
        descriptionPl: "<h2>Magnez</h2><p>Zawiera 350 mg. Leczy skurcze.</p><div>x</div>",
        metaTitlePl: "Magnez 300 mg",
        metaDescPl: null,
        primaryCategory: "magnez",
        extraCategories: ["na-stres"],
      },
      "Magnez 300 mg w kapsułce",
      "Magnez MSE 120 kaps.",
      cats,
    );
    expect(problems.map((p) => p.type).sort()).toEqual([
      "banned-word",
      "html-tag",
      "unknown-slug",
      "unsourced-number",
    ]);
    expect(problems.find((p) => p.type === "unsourced-number")?.text).toBe("350 mg");
  });
});

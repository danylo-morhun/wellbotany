import { describe, expect, it } from "vitest";
import type { CategoryItem } from "@/features/catalog/actions";
import { buildCategoryNav, computeSubtreeCounts } from "@/features/catalog/lib/nav";
import { categoryLinkIds } from "@/features/products/lib/category-links";
import { onlyEmptyFields } from "@/features/products/lib/import/merge";

const cat = (
  id: string,
  group: CategoryItem["group"],
  parentId: string | null = null,
  productCount = 5,
): CategoryItem => ({
  id,
  slug: id,
  namePl: id,
  headingPl: null,
  group,
  image: null,
  icon: null,
  sortOrder: 0,
  parentId,
  productCount,
});

describe("computeSubtreeCounts", () => {
  it("counts a product listed in two children once under their parent", () => {
    const categories = [
      cat("mineraly", "TYPE"),
      cat("magnez", "TYPE", "mineraly"),
      cat("cynk", "TYPE", "mineraly"),
    ];
    const counts = computeSubtreeCounts(categories, [
      { productId: "p1", categoryId: "magnez" },
      { productId: "p1", categoryId: "cynk" },
      { productId: "p2", categoryId: "cynk" },
    ]);
    expect(counts.get("mineraly")).toBe(2);
    expect(counts.get("cynk")).toBe(2);
    expect(counts.get("magnez")).toBe(1);
  });
});

describe("buildCategoryNav", () => {
  it("groups menus and hides near-empty categories", () => {
    const nav = buildCategoryNav([
      cat("witaminy", "TYPE"),
      cat("witamina-d", "TYPE", "witaminy"),
      cat("witamina-x", "TYPE", "witaminy", 1),
      cat("na-sen", "NEED"),
      cat("dla-kobiet", "AUDIENCE"),
      cat("kosmetyki", "OTHER"),
      cat("pielegnacja-twarzy", "OTHER", "kosmetyki"),
      cat("ksiazki", "OTHER"),
    ]);
    expect(nav.map((m) => m.key)).toEqual(["suplementy", "na-co", "kosmetyki"]);
    expect(nav[0].sections[0].links.map((l) => l.slug)).toEqual(["witamina-d"]);
    expect(nav[1].sections.map((s) => s.title)).toEqual([undefined, "Dla kogo"]);
    expect(nav[2].sections[1]).toMatchObject({ title: "Więcej", links: [{ slug: "ksiazki" }] });
  });
});

describe("categoryLinkIds", () => {
  it("always includes the primary category, without duplicates", () => {
    expect(categoryLinkIds("magnez", ["na-sen", "magnez"])).toEqual(["magnez", "na-sen"]);
    expect(categoryLinkIds(null, ["na-sen"])).toEqual(["na-sen"]);
  });
});

describe("onlyEmptyFields", () => {
  it("fills empty fields only, never overwrites curated text", () => {
    expect(
      onlyEmptyFields(
        { descriptionPl: "<p>nasz opis</p>", storageInfo: null, benefitsPl: [] },
        {
          descriptionPl: "opis dostawcy",
          storageInfo: "w suchym miejscu",
          benefitsPl: ["a"],
          servingSize: undefined,
        },
      ),
    ).toEqual({ storageInfo: "w suchym miejscu", benefitsPl: ["a"] });
  });
});

import { describe, expect, it } from "vitest";
import { productKind } from "@/features/products/lib/product-kind";

describe("productKind", () => {
  it("reads the kind from the primary category", () => {
    expect(productKind(null)).toBe("supplement");
    expect(productKind({ slug: "magnez", group: "TYPE", parent: { slug: "mineraly" } })).toBe(
      "supplement",
    );
    expect(productKind({ slug: "na-sen", group: "NEED", parent: null })).toBe("supplement");
    expect(productKind({ slug: "batony", group: "OTHER", parent: { slug: "zywnosc" } })).toBe(
      "food",
    );
    expect(productKind({ slug: "zywnosc", group: "OTHER", parent: null })).toBe("food");
    expect(
      productKind({ slug: "pielegnacja-twarzy", group: "OTHER", parent: { slug: "kosmetyki" } }),
    ).toBe("nonFood");
    expect(productKind({ slug: "akcesoria", group: "OTHER", parent: null })).toBe("nonFood");
  });
});

import { describe, expect, it } from "vitest";
import { pluralize } from "@/features/reviews/lib/plural";
import { publicName } from "@/features/reviews/lib/queries";
import { buildProductJsonLd } from "@/lib/seo";

const base = {
  name: "Magnez",
  images: [{ url: "m.jpg", variantId: null }],
  variants: [
    {
      id: "v1",
      sku: "M1",
      ean: null,
      optionValue: null,
      pricePln: 4990,
      stock: 5,
      trackStock: true,
      isDefault: true,
    },
  ],
  slug: "magnez",
  freeShippingThresholdPln: 20000,
};

describe("publicName", () => {
  it("shortens the surname to an initial", () => {
    expect(publicName("Anna Kowalska")).toBe("Anna K.");
    expect(publicName("  jan  maria nowak ")).toBe("jan N.");
    expect(publicName("Anna")).toBe("Anna");
  });
});

describe("pluralize", () => {
  it.each([
    [1, "opinia"],
    [3, "opinie"],
    [5, "opinii"],
    [13, "opinii"],
    [24, "opinie"],
  ])("%i → %s", (count, word) => {
    expect(pluralize(count)).toBe(word);
  });
});

describe("buildProductJsonLd reviews", () => {
  it("adds aggregateRating only when approved reviews exist", () => {
    const none = buildProductJsonLd({
      ...base,
      reviews: { average: null, count: 0, items: [] },
    }) as Record<string, unknown>;
    expect(none.aggregateRating).toBeUndefined();

    const withReviews = buildProductJsonLd({
      ...base,
      reviews: {
        average: 4.5,
        count: 2,
        items: [
          { authorName: "Anna K.", rating: 5, content: "Dobry", createdAt: new Date("2026-09-01") },
          { authorName: "Jan N.", rating: 4, content: "Ok", createdAt: new Date("2026-09-02") },
        ],
      },
    }) as Record<string, any>;
    expect(withReviews.aggregateRating).toMatchObject({ ratingValue: "4.5", reviewCount: 2 });
    expect(withReviews.review).toHaveLength(2);
    expect(withReviews.review[0].author.name).toBe("Anna K.");
  });
});

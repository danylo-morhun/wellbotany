import { describe, expect, it } from "vitest";
import { imagesForVariant, resolveVariantId } from "@/features/catalog/lib/variant-images";
import { buildProductJsonLd } from "@/lib/seo";

const images = [
  { url: "shared.jpg", variantId: null },
  { url: "v60.jpg", variantId: "v60" },
];
const variants = [
  {
    id: "v60",
    sku: "A",
    ean: "5901234123457",
    optionValue: "60 kaps.",
    pricePln: 4990,
    stock: 0,
    trackStock: false,
    isDefault: true,
  },
  {
    id: "v120",
    sku: "B",
    ean: null,
    optionValue: "120 kaps.",
    pricePln: 8990,
    stock: 0,
    trackStock: true,
    isDefault: false,
  },
];

describe("imagesForVariant", () => {
  it("shows a variant's own photos, else the shared ones", () => {
    expect(imagesForVariant(images, "v60").map((i) => i.url)).toEqual(["v60.jpg"]);
    expect(imagesForVariant(images, "v120").map((i) => i.url)).toEqual(["shared.jpg"]);
  });
});

describe("resolveVariantId", () => {
  it("accepts only an existing variant, else the default", () => {
    expect(resolveVariantId(variants, "v120")).toBe("v120");
    expect(resolveVariantId(variants, "nope")).toBe("v60");
    expect(resolveVariantId([], undefined)).toBeNull();
  });
});

describe("buildProductJsonLd", () => {
  it("emits a ProductGroup with one Offer and GTIN per variant", () => {
    const ld = buildProductJsonLd({
      name: "Magnez",
      description: "<p>Opis <strong>magnezu</strong></p>",
      images,
      brandName: "Kenay",
      variants,
      slug: "magnez",
    }) as Record<string, any>;
    expect(ld["@type"]).toBe("ProductGroup");
    expect(ld.description).toBe("Opis magnezu");
    expect(ld.hasVariant).toHaveLength(2);
    expect(ld.hasVariant[0]).toMatchObject({
      gtin: "5901234123457",
      image: ["v60.jpg"],
      offers: {
        price: "49.90",
        availability: "https://schema.org/InStock",
        url: "https://wellbotany.pl/produkt/magnez?wariant=v60",
      },
    });
    // tracked and out of stock
    expect(ld.hasVariant[1].offers.availability).toBe("https://schema.org/OutOfStock");
    expect(ld.hasVariant[1].gtin).toBeUndefined();
  });

  it("emits a plain Product for a single variant", () => {
    const ld = buildProductJsonLd({
      name: "Cynk",
      images,
      variants: [variants[1]],
      slug: "cynk",
    }) as Record<string, any>;
    expect(ld["@type"]).toBe("Product");
    expect(ld.url).toBe("https://wellbotany.pl/produkt/cynk");
  });
});

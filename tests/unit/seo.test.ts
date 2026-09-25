import { beforeAll, describe, expect, it, vi } from "vitest";
import { pluralizeProducts } from "@/lib/format";
import { buildBreadcrumbJsonLd, buildListingSeo, buildPageTitle } from "@/lib/seo";

// CI sets NEXT_PUBLIC_SITE_URL to localhost; the expectations use the real domain
beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wellbotany.pl");
});

describe("buildListingSeo", () => {
  it("keeps page 1 on the clean URL", () => {
    expect(buildListingSeo("/kategoria/magnez", {})).toEqual({
      page: 1,
      canonical: "/kategoria/magnez",
      noindex: false,
      titleSuffix: "",
    });
  });

  it("makes page N its own canonical", () => {
    const seo = buildListingSeo("/kategoria/magnez", { strona: "3" });
    expect(seo.canonical).toBe("/kategoria/magnez?strona=3");
    expect(seo.titleSuffix).toBe(" – strona 3");
    expect(seo.noindex).toBe(false);
  });

  it("noindexes filtered, sorted and search views", () => {
    expect(buildListingSeo("/katalog", { marka: "kenay" }).noindex).toBe(true);
    expect(buildListingSeo("/katalog", { sortuj: "price_asc" }).noindex).toBe(true);
    expect(buildListingSeo("/katalog", { szukaj: "magnez" }).noindex).toBe(true);
  });

  it("treats junk page numbers as page 1", () => {
    expect(buildListingSeo("/katalog", { strona: "abc" }).page).toBe(1);
    expect(buildListingSeo("/katalog", { strona: "-2" }).page).toBe(1);
  });
});

describe("buildPageTitle", () => {
  it("strips a site name already in the stored title", () => {
    expect(buildPageTitle("Magnez 300 mg | Kenay | Well Botany")).toBe("Magnez 300 mg | Kenay");
  });

  it("drops the template suffix when the title would exceed 60 chars", () => {
    const long = "Witamina K2 Menachinon MonoFORTE MK-7 200 µg – 60 kaps.";
    expect(buildPageTitle(long)).toEqual({ absolute: long });
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("uses absolute item URLs", () => {
    const ld = buildBreadcrumbJsonLd([{ name: "Katalog", href: "/katalog" }]);
    expect(ld.itemListElement[0].item).toBe("https://wellbotany.pl/katalog");
  });
});

describe("pluralizeProducts", () => {
  it.each([
    [1, "produkt"],
    [3, "produkty"],
    [5, "produktów"],
    [12, "produktów"],
    [22, "produkty"],
    [25, "produktów"],
  ])("%i → %s", (count, word) => {
    expect(pluralizeProducts(count)).toBe(word);
  });
});

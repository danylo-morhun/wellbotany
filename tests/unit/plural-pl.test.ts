import { describe, expect, it } from "vitest";
import { pluralPl } from "@/lib/format";

const produkt = (n: number) => pluralPl(n, "produkt", "produkty", "produktów");

describe("pluralPl", () => {
  it("uses the singular only for exactly one", () => {
    expect(produkt(1)).toBe("produkt");
    expect(produkt(21)).toBe("produktów");
  });

  it("uses the few form for 2–4 outside the teens", () => {
    for (const n of [2, 3, 4, 22, 34, 102]) expect(produkt(n)).toBe("produkty");
  });

  it("uses the many form for 0, 5–21 and teens", () => {
    for (const n of [0, 5, 11, 12, 14, 25, 112, 114]) expect(produkt(n)).toBe("produktów");
  });

  it("matches Intl.PluralRules for Polish", () => {
    const rules = new Intl.PluralRules("pl");
    const forms = { one: "produkt", few: "produkty", many: "produktów" } as const;
    for (let n = 0; n <= 200; n++) {
      expect(produkt(n)).toBe(forms[rules.select(n) as keyof typeof forms]);
    }
  });
});

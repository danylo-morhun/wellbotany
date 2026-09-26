import { describe, expect, it } from "vitest";
import { omnibusNote } from "@/lib/omnibus";

describe("omnibusNote", () => {
  it("describes the lowest price before a reduction", () => {
    expect(omnibusNote({ pricePln: 3990, comparePricePln: 4990, lowestPrice30dPln: 4590 })).toMatch(
      /^Najniższa cena z 30 dni przed obniżką: 45,90/,
    );
  });

  it("is null without a reduction", () => {
    expect(omnibusNote({ pricePln: 3990, comparePricePln: null, lowestPrice30dPln: null })).toBe(
      null,
    );
    expect(omnibusNote({ pricePln: 3990, comparePricePln: 3990, lowestPrice30dPln: 3990 })).toBe(
      null,
    );
  });
});

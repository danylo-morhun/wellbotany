import { describe, expect, it } from "vitest";
import { epakaPointQuery, exactCodeFirst, isSamePointCode } from "@/features/checkout/lib/points";

describe("pickup point code search", () => {
  it("matches codes ignoring case, spaces and leading zeros", () => {
    expect(isSamePointCode("KAL06M", "kal06m")).toBe(true);
    expect(isSamePointCode("48906", "048906")).toBe(true);
    expect(isSamePointCode("KA-393946-W9-04", " KA-393946-W9-04")).toBe(true);
    expect(isSamePointCode("KAL06M", "KAL06")).toBe(false);
  });

  it("pads FedEx codes to the 6 digits epaka searches by", () => {
    expect(epakaPointQuery("FEDEX_POINT", "48906")).toBe("048906");
    expect(epakaPointQuery("FEDEX_POINT", "Kalisz")).toBe("Kalisz");
    expect(epakaPointQuery("DHL_POINT", "4599189")).toBe("4599189");
  });

  it("moves the exact code to the top and keeps the rest in order", () => {
    const pts = [{ id: "POP-KAL16" }, { id: "KAL05M" }, { id: "KAL06M" }];
    expect(exactCodeFirst(pts, "kal06m").map((p) => p.id)).toEqual([
      "KAL06M",
      "POP-KAL16",
      "KAL05M",
    ]);
    expect(exactCodeFirst(pts, "Kalisz")).toBe(pts);
  });
});

import { describe, expect, it } from "vitest";
import { contractInfoHtml } from "@/lib/email/contract-info";
import { SELLER } from "@/lib/seller";

describe("contractInfoHtml", () => {
  const html = contractInfoHtml("WB-2026-00042");

  it("identifies the seller (UPK art. 12 ust. 1 pkt 2–3)", () => {
    for (const value of [SELLER.registry, SELLER.address, SELLER.email, SELLER.phone])
      expect(html).toContain(value);
  });

  it("carries the statutory withdrawal notice and form (zał. 1 and 2)", () => {
    expect(html).toContain("Mają Państwo prawo odstąpić od niniejszej umowy w terminie 14 dni");
    expect(html).toContain("Możemy wstrzymać się ze zwrotem płatności");
    expect(html).toContain(`Adresat: ${SELLER.legalName}, ${SELLER.address}, ${SELLER.email}`);
    expect(html).toContain("(*) Niepotrzebne skreślić.");
  });

  it("links the online withdrawal form for this order", () => {
    expect(html).toContain("/odstapienie?zamowienie=WB-2026-00042");
    expect(html).toContain("Odstąp od umowy tutaj");
  });
});

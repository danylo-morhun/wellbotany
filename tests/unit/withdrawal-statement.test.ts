import { describe, expect, it } from "vitest";
import { formatReceivedAt, withdrawalStatement } from "@/features/withdrawal/lib/statement";

describe("withdrawalStatement", () => {
  it("names the items the consumer listed", () => {
    expect(
      withdrawalStatement({ name: "Anna Nowak", orderNumber: "WB-1", items: "Krem 50 ml" }),
    ).toBe(
      "Ja, Anna Nowak, niniejszym informuję o odstąpieniu od umowy sprzedaży następujących towarów: Krem 50 ml (zamówienie WB-1).",
    );
  });

  it("covers the whole order when no items are given", () => {
    expect(withdrawalStatement({ name: "A B", orderNumber: "WB-1", items: "  " })).toContain(
      "wszystkich towarów z zamówienia",
    );
  });
});

describe("formatReceivedAt", () => {
  it("shows Warsaw time with seconds", () => {
    // 10:05:07 UTC = 12:05:07 CEST
    expect(formatReceivedAt(new Date("2026-06-20T10:05:07Z"))).toContain("12:05:07");
  });
});

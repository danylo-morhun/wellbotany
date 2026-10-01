import { describe, expect, it } from "vitest";
import { matchTransfers } from "@/features/orders/lib/reconcile";

const orders = [
  { id: "a", orderNumber: "TZ-2026-00042", totalPln: 12990 },
  { id: "b", orderNumber: "TZ-2026-00043", totalPln: 123456 },
  { id: "c", orderNumber: "TZ-2026-00044", totalPln: 4990 },
];

describe("matchTransfers", () => {
  it("matches order numbers regardless of separators and case", () => {
    const text = [
      "30.09.2026 Jan Kowalski  Zamówienie TZ-2026-00042  +129,90 PLN",
      "30.09.2026 Anna Nowak  tz 2026 00043  1 234,56 PLN",
    ].join("\n");
    const m = matchTransfers(text, orders);
    expect(m.map((x) => x.orderId)).toEqual(["a", "b"]);
    expect(m.every((x) => x.amountMatches)).toBe(true);
  });

  it("reads amounts from nearby lines and flags mismatches", () => {
    const text = "Tytuł: TZ202600044\nKwota: 39,90";
    const [m] = matchTransfers(text, orders);
    expect(m.orderId).toBe("c");
    expect(m.amountMatches).toBe(false);
    expect(m.amounts).toEqual([3990]);
  });

  it("parses NBSP and dot thousand separators", () => {
    const text = "TZ-2026-00043 kwota 1\u00a0234,56\nTZ-2026-00042 1.299,00";
    const m = matchTransfers(text, orders);
    expect(m.find((x) => x.orderId === "b")?.amountMatches).toBe(true);
  });

  it("ignores dates when reading amounts", () => {
    const text = "30.09.2026 Jan Kowalski\nZamówienie TZ-2026-00042\n2026-10-01 129,90 PLN";
    const [m] = matchTransfers(text, orders);
    expect(m.amounts).toEqual([12990]);
    expect(m.amountMatches).toBe(true);
  });

  it("does not match a longer order number prefix", () => {
    expect(matchTransfers("TZ-2026-000421", orders)).toHaveLength(0);
  });
});

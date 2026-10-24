import { describe, expect, it } from "vitest";
import {
  diffLevels,
  groupByValue,
  matchItems,
  onlineStock,
  rejectReason,
} from "@/features/stock-sync/lib/plan";
import {
  MAX_CLOCK_SKEW_MS,
  signSnapshot,
  verifySnapshot,
} from "@/features/stock-sync/lib/signature";

const variants = [
  { id: "v1", sku: "SING-001", ean: "5903263266014" },
  { id: "v2", sku: "SING-002", ean: null },
  { id: "v3", sku: "KEN-010", ean: "5901234567890" },
];

describe("verifySnapshot", () => {
  const now = 1_760_000_000_000;
  const ts = String(now);
  const body = '{"mode":"delta","items":[]}';
  const sig = signSnapshot("s3cret", ts, body);

  it("accepts the agent's signature", () => {
    expect(verifySnapshot("s3cret", ts, body, sig, now)).toBe(true);
  });

  it("rejects a changed body, a wrong secret or a stale timestamp", () => {
    expect(verifySnapshot("s3cret", ts, body.replace("delta", "full"), sig, now)).toBe(false);
    expect(verifySnapshot("other", ts, body, sig, now)).toBe(false);
    expect(verifySnapshot("s3cret", ts, body, sig, now + MAX_CLOCK_SKEW_MS + 1)).toBe(false);
    expect(verifySnapshot("s3cret", "not-a-number", body, sig, now)).toBe(false);
  });
});

describe("matchItems", () => {
  it("matches by EAN first, then by symbol case-insensitively", () => {
    const { quantities, unmatched } = matchItems(
      [
        { symbol: "OTHER-SYMBOL", ean: "5903263266014", quantity: 4 },
        { symbol: "sing-002", ean: "", quantity: 2 },
        { symbol: "NOPE", ean: "1111111111111", quantity: 9 },
      ],
      variants,
    );
    expect(quantities).toEqual(
      new Map([
        ["v1", 4],
        ["v2", 2],
      ]),
    );
    expect(unmatched.map((i) => i.symbol)).toEqual(["NOPE"]);
  });

  it("falls back to a symbol that holds our EAN", () => {
    const { quantities, unmatched } = matchItems(
      [
        { symbol: "5901234567890", ean: "5900000000001", quantity: 3 },
        { symbol: "5909999999999", ean: "", quantity: 1 },
      ],
      variants,
    );
    expect(quantities).toEqual(new Map([["v3", 3]]));
    expect(unmatched.map((i) => i.symbol)).toEqual(["5909999999999"]);
  });

  it("treats negative Subiekt stock as 0 and sums duplicates", () => {
    const { quantities } = matchItems(
      [
        { symbol: "KEN-010", quantity: -3 },
        { symbol: "X", ean: "5901234567890", quantity: 5 },
      ],
      variants,
    );
    expect(quantities.get("v3")).toBe(5);
  });
});

describe("diffLevels", () => {
  const current = new Map([
    ["v1", 4],
    ["v2", 0],
    ["v3", 7],
  ]);

  it("delta: only changed variants", () => {
    const changes = diffLevels(
      "delta",
      current,
      new Map([
        ["v1", 4],
        ["v3", 6],
      ]),
    );
    expect(changes).toEqual(new Map([["v3", 6]]));
  });

  it("full: variants missing from the snapshot drop to 0", () => {
    const changes = diffLevels("full", current, new Map([["v1", 5]]));
    expect(changes).toEqual(
      new Map([
        ["v1", 5],
        ["v3", 0],
      ]),
    );
  });
});

describe("rejectReason", () => {
  const shelf = new Map(Array.from({ length: 40 }, (_, i) => [`v${i}`, 3]));

  it("rejects a full snapshot that matched nothing", () => {
    expect(rejectReason("full", 0, new Map(), new Map())).toMatch(/matched no products/);
  });

  it("rejects one that empties most of the shelf", () => {
    const changes = new Map([...shelf.keys()].slice(0, 25).map((id) => [id, 0]));
    expect(rejectReason("full", 15, shelf, changes)).toMatch(/zero 25 of 40/);
  });

  it("lets normal sales through", () => {
    const changes = new Map([...shelf.keys()].slice(0, 5).map((id) => [id, 0]));
    expect(rejectReason("delta", 5, shelf, changes)).toBeNull();
  });
});

describe("onlineStock", () => {
  it("sums online locations minus safety stock and pending web orders", () => {
    const levels = [
      { quantity: 5, sellsOnline: true, safetyStock: 1 },
      { quantity: 3, sellsOnline: true, safetyStock: 1 },
      { quantity: 50, sellsOnline: false, safetyStock: 0 },
    ];
    expect(onlineStock(levels, 0)).toBe(6);
    expect(onlineStock(levels, 2)).toBe(4);
    expect(onlineStock(levels, 10)).toBe(0);
  });

  it("never lets safety stock go below zero per location", () => {
    expect(onlineStock([{ quantity: 0, sellsOnline: true, safetyStock: 1 }], 0)).toBe(0);
  });
});

describe("groupByValue", () => {
  it("groups ids by their value", () => {
    expect(
      groupByValue(
        new Map([
          ["a", 1],
          ["b", 0],
          ["c", 1],
        ]),
      ),
    ).toEqual(
      new Map([
        [1, ["a", "c"]],
        [0, ["b"]],
      ]),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  compareCatalog,
  pairVariants,
  percentChange,
  planCostUpdates,
} from "@/features/stock-sync/lib/catalog-plan";
import { variantIndex } from "@/features/stock-sync/lib/plan";
import type { CatalogItem } from "@/features/stock-sync/schema";

const card = (symbol: string, purchaseNet?: number, ean?: string): CatalogItem => ({
  symbol,
  ean,
  name: symbol,
  pricesGross: [1999],
  purchaseNet,
  blocked: false,
});

const variants = [
  { id: "v1", sku: "A", ean: "5900000000017", costPricePln: 1000 },
  { id: "v2", sku: "B", ean: null, costPricePln: null },
  { id: "v3", sku: "C", ean: null, costPricePln: 1000 },
];
const index = variantIndex(variants);

describe("planCostUpdates", () => {
  it("fills empty costs and moves existing ones within ±50%", () => {
    const plan = planCostUpdates(
      [card("X", 1100, "5900000000017"), card("B", 500)],
      index,
      variants,
    );
    expect(plan.apply).toEqual(
      new Map([
        ["v1", 1100],
        ["v2", 500],
      ]),
    );
    expect(plan.review).toEqual([]);
    expect(plan.guard).toBeNull();
  });

  it("never clears a cost when Subiekt has none and skips unchanged ones", () => {
    const plan = planCostUpdates([card("A"), card("C", 1000)], index, variants);
    expect(plan.apply.size).toBe(0);
  });

  it("sends big jumps and conflicting cards to review", () => {
    const plan = planCostUpdates(
      [
        card("A", 1600),
        card("B", 400),
        card("590", 450, undefined),
        { ...card("Y", 900), symbol: "b" },
      ],
      index,
      variants,
    );
    expect(plan.apply.size).toBe(0);
    expect(plan.review).toEqual([
      { variantId: "v1", current: 1000, incoming: 1600, reason: "change-too-large" },
      { variantId: "v2", current: null, incoming: 400, reason: "ambiguous" },
    ]);
  });

  it("holds back a mass change but still fills empty costs", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `m${i}`,
      sku: `M${i}`,
      ean: null,
      costPricePln: 1000,
    }));
    const all = [...many, { id: "e", sku: "E", ean: null, costPricePln: null }];
    const items = [...many.map((v) => card(v.sku, 1200)), card("E", 700)];
    const plan = planCostUpdates(items, variantIndex(all), all);
    expect(plan.guard).toMatch(/30 of 30/);
    expect(plan.apply).toEqual(new Map([["e", 700]]));
  });
});

describe("report", () => {
  const ours = [
    {
      id: "v1",
      sku: "A",
      ean: null,
      pricePln: 1999,
      costPricePln: 1000,
      vatRate: 5,
      weightGrams: null,
    },
    {
      id: "v2",
      sku: "B",
      ean: null,
      pricePln: 2500,
      costPricePln: null,
      vatRate: 8,
      weightGrams: 100,
    },
    {
      id: "v3",
      sku: "Z",
      ean: null,
      pricePln: 900,
      costPricePln: null,
      vatRate: 5,
      weightGrams: null,
    },
  ];
  const cards = [
    {
      symbol: "A",
      ean: null,
      name: "A",
      vatRate: 5,
      purchaseNetPln: 1000,
      pricesGrossPln: [1999, 1500],
      weightGrams: 120,
      lastDeliveryNetPln: null,
      blocked: false,
    },
    {
      symbol: "B",
      ean: null,
      name: "B",
      vatRate: 23,
      purchaseNetPln: null,
      pricesGrossPln: [2900, 0],
      weightGrams: 90,
      lastDeliveryNetPln: 1300,
      blocked: true,
    },
  ];

  it("pairs variants with cards and lists the rest", () => {
    const { pairs, missing } = pairVariants(ours, cards, variantIndex(ours));
    expect(pairs.map((p) => p.variant.id)).toEqual(["v1", "v2"]);
    expect(missing.map((v) => v.id)).toEqual(["v3"]);

    const level1 = compareCatalog(pairs, 1);
    expect(level1.prices.map((p) => p.variant.id)).toEqual(["v2"]);
    expect(level1.costs.map((p) => p.variant.id)).toEqual(["v2"]); // only last delivery known
    expect(level1.vat.map((p) => p.variant.id)).toEqual(["v2"]);
    expect(level1.weight.map((p) => p.variant.id)).toEqual(["v1"]);
    expect(level1.blocked.map((p) => p.variant.id)).toEqual(["v2"]);

    // Level 2: v1 differs, v2 has no price at that level
    expect(compareCatalog(pairs, 2).prices.map((p) => p.variant.id)).toEqual(["v1"]);
  });

  it("percent change is relative to our value", () => {
    expect(percentChange(3593, 8260)).toBe(129.9);
    expect(percentChange(0, 100)).toBe(0);
  });
});

describe("POST /api/sync/subiekt/catalog", async () => {
  const applyCatalog = vi.fn();
  vi.doMock("@/features/stock-sync/lib/catalog-apply", () => ({ applyCatalog }));
  vi.doMock("@/features/stock-sync/lib/signature", () => ({ authenticate: () => "sklep1" }));
  const { POST } = await import("@/app/api/sync/subiekt/catalog/route");
  const post = (body: unknown) =>
    POST(
      new Request("https://wellbotany.pl/api/sync/subiekt/catalog", {
        method: "POST",
        body: JSON.stringify(body),
      }) as never,
    );

  it("rejects an empty full catalog and bad payloads", async () => {
    expect((await post({ mode: "full", items: [] })).status).toBe(422);
    expect((await post({ mode: "full", items: [], removed: ["A"] })).status).toBe(400);
    expect((await post({ mode: "delta", items: [{ symbol: "A" }] })).status).toBe(400);
    expect(applyCatalog).not.toHaveBeenCalled();
  });

  it("applies a valid delta", async () => {
    applyCatalog.mockResolvedValue({ ok: true, stored: 1, removed: 1 });
    const res = await post({
      mode: "delta",
      agentVersion: "0.2.0",
      items: [{ ...card("A", 1000), lastDeliveryAt: "2026-11-10T00:00:00" }],
      removed: ["Z"],
    });
    expect(res.status).toBe(200);
    expect(applyCatalog).toHaveBeenCalledWith("sklep1", expect.objectContaining({ mode: "delta" }));
  });
});

import { describe, expect, it } from "vitest";
import { returningShare, splitBuyers } from "@/features/analytics/lib/customers";
import { expenseTotals } from "@/features/analytics/lib/expenses";
import { resolvePeriod } from "@/features/analytics/lib/period";
import {
  coveragePercent,
  marginPercent,
  mer,
  orderLines,
  type ProfitOrder,
  profitByProduct,
  resultPln,
  summarizeProfit,
} from "@/features/analytics/lib/profit";
import { daysOfCover, runningOut } from "@/features/analytics/lib/stock";

const item = (o: Partial<ProfitOrder["items"][number]> = {}) => ({
  variantId: "v1",
  productName: "Magnez",
  quantity: 2,
  totalPln: 10500, // 2 × 52,50 zł gross at 5% VAT → 100 zł net
  vatRate: 5,
  unitCostPln: 3000,
  ...o,
});

const order = (o: Partial<ProfitOrder> = {}): ProfitOrder => ({
  subtotalPln: 10500,
  discountPln: 0,
  shippingPln: 1230, // 10 zł net at 23%
  totalPln: 11730,
  items: [item()],
  ...o,
});

describe("orderLines", () => {
  it("nets VAT and subtracts unit cost × quantity", () => {
    const [line] = orderLines(order());
    expect(line.netPln).toBe(10000);
    expect(line.marginPln).toBe(4000);
  });

  it("spreads the order discount by line value", () => {
    const lines = orderLines(
      order({
        subtotalPln: 21000,
        discountPln: 2100,
        items: [item(), item({ variantId: "v2" })],
      }),
    );
    expect(lines.map((l) => l.netPln)).toEqual([9000, 9000]);
  });

  it("leaves margin unknown without a cost", () => {
    expect(orderLines(order({ items: [item({ unitCostPln: null })] }))[0].marginPln).toBeNull();
  });
});

describe("summarizeProfit", () => {
  const s = summarizeProfit([
    order(),
    order({ items: [item({ variantId: "v2", unitCostPln: null })] }),
  ]);

  it("sums revenue, net goods and delivery", () => {
    expect(s).toMatchObject({
      orders: 2,
      revenuePln: 23460,
      netGoodsPln: 20000,
      netShippingPln: 2000,
      marginPln: 4000,
      coveredNetPln: 10000,
    });
  });

  it("reports coverage and margin on covered lines only", () => {
    expect(coveragePercent(s)).toBe(50);
    expect(marginPercent(s)).toBe(40);
  });

  it("result = margin + delivery − costs", () => {
    expect(resultPln(s, 5000)).toBe(1000);
  });
});

describe("mer", () => {
  it("is sales ÷ ad spend, one decimal", () => expect(mer(100000, 30000)).toBe(3.3));
  it("is null without spend", () => expect(mer(100000, 0)).toBeNull());
});

describe("profitByProduct", () => {
  it("groups by variant, best margin first, unknown last", () => {
    const rows = profitByProduct([
      order(),
      order(),
      order({ items: [item({ variantId: "v2", unitCostPln: null })] }),
      order({ items: [item({ variantId: "v3", unitCostPln: 4500 })] }),
    ]);
    expect(rows.map((r) => [r.key, r.quantity, r.marginPln])).toEqual([
      ["v1", 4, 8000],
      ["v3", 2, 1000],
      ["v2", 2, null],
    ]);
  });
});

describe("stock cover", () => {
  it("divides stock by daily pace", () => expect(daysOfCover(10, 30, 30)).toBe(10));
  it("is null when nothing sold", () => expect(daysOfCover(10, 0, 30)).toBeNull());

  it("lists only variants running out within 14 days, soonest first", () => {
    const rows = runningOut(
      [
        { variantId: "a", stock: 10, sold: 30 },
        { variantId: "b", stock: 0, sold: 3 },
        { variantId: "c", stock: 100, sold: 30 },
        { variantId: "d", stock: 5, sold: 0 },
      ],
      30,
    );
    expect(rows.map((r) => [r.variantId, r.cover])).toEqual([
      ["b", 0],
      ["a", 10],
    ]);
  });
});

describe("splitBuyers", () => {
  const start = new Date("2026-10-01T00:00:00Z");
  const first = new Map([
    ["old@x.pl", new Date("2026-08-01T00:00:00Z")],
    ["new@x.pl", new Date("2026-10-05T00:00:00Z")],
  ]);

  it("counts buyers who bought before the period as returning", () => {
    const s = splitBuyers(["old@x.pl", "old@x.pl", "new@x.pl"], first, start);
    expect(s).toEqual({ newBuyers: 1, returningBuyers: 1, returningOrders: 2 });
    expect(returningShare(s, 3)).toBe(67);
  });
});

describe("expenseTotals", () => {
  it("separates ad spend", () => {
    const t = expenseTotals([
      { category: "ADS_GOOGLE", amountPln: 1000 },
      { category: "ADS_META", amountPln: 500 },
      { category: "SERVICES", amountPln: 200 },
    ]);
    expect([t.total, t.ads, t.byCategory.get("ADS_GOOGLE")]).toEqual([1700, 1500, 1000]);
  });
});

describe("resolvePeriod", () => {
  const now = new Date("2026-10-29T10:00:00Z");

  it("defaults to the last 30 shop days including today", () => {
    expect(resolvePeriod(undefined, now)).toMatchObject({
      key: "30",
      from: "2026-09-30",
      to: "2026-10-29",
      days: 30,
    });
  });

  it("previous month spans the whole month", () => {
    const p = resolvePeriod("poprz-miesiac", now);
    expect(p).toMatchObject({ from: "2026-09-01", to: "2026-09-30", days: 30 });
    expect(p.start.toISOString()).toBe("2026-08-31T22:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-09-30T22:00:00.000Z");
  });

  it("this month runs to today", () => {
    expect(resolvePeriod("miesiac", now)).toMatchObject({ from: "2026-10-01", days: 29 });
  });
});

// Profit of sold orders — pure. Prices on orders are gross grosz, costs are net
// grosz (like `costPricePln`), so everything is compared net of VAT.

import type { OrderStatus } from "@prisma/client";
import { netPricePln } from "@/features/products/lib/margin";

/** Carts never submitted and cancelled/refunded orders don't count as sales */
export const NOT_SALES: OrderStatus[] = ["PENDING", "CANCELLED", "REFUNDED"];

/** Prisma select for the order fields `toProfitOrder` reads */
export const profitOrderSelect = {
  subtotalPln: true,
  discountPln: true,
  shippingPln: true,
  totalPln: true,
  items: {
    select: {
      variantId: true,
      productName: true,
      quantity: true,
      totalPln: true,
      vatRate: true,
      unitCostPln: true,
      variant: { select: { costPricePln: true } },
    },
  },
} as const;

/** VAT on the delivery fee charged to the customer */
const SHIPPING_VAT = 23;

export type ProfitItem = {
  variantId: string | null;
  productName: string;
  quantity: number;
  /** Gross line value before the order discount */
  totalPln: number;
  vatRate: number;
  /** Net unit cost: the order-time snapshot, else the current variant cost, else null */
  unitCostPln: number | null;
};

export type ProfitOrder = {
  subtotalPln: number;
  discountPln: number;
  shippingPln: number;
  totalPln: number;
  items: ProfitItem[];
};

export type ProfitLine = ProfitItem & {
  /** Net revenue after this line's share of the order discount */
  netPln: number;
  /** Net revenue minus cost; null without a cost */
  marginPln: number | null;
};

/** Order lines net of VAT, with the order discount spread by line value */
export function orderLines(order: ProfitOrder): ProfitLine[] {
  const keep = order.subtotalPln > 0 ? 1 - order.discountPln / order.subtotalPln : 1;
  return order.items.map((item) => {
    const netPln = netPricePln(Math.round(item.totalPln * keep), item.vatRate);
    const marginPln = item.unitCostPln === null ? null : netPln - item.unitCostPln * item.quantity;
    return { ...item, netPln, marginPln };
  });
}

export type ProfitSummary = {
  orders: number;
  /** Gross, what customers paid */
  revenuePln: number;
  discountPln: number;
  /** Net goods revenue after discounts */
  netGoodsPln: number;
  /** Net delivery fees charged to customers */
  netShippingPln: number;
  /** Margin on lines that have a cost */
  marginPln: number;
  /** Net revenue of the lines behind `marginPln` */
  coveredNetPln: number;
};

export function summarizeProfit(orders: ProfitOrder[]): ProfitSummary {
  const s: ProfitSummary = {
    orders: orders.length,
    revenuePln: 0,
    discountPln: 0,
    netGoodsPln: 0,
    netShippingPln: 0,
    marginPln: 0,
    coveredNetPln: 0,
  };
  for (const order of orders) {
    s.revenuePln += order.totalPln;
    s.discountPln += order.discountPln;
    s.netShippingPln += netPricePln(order.shippingPln, SHIPPING_VAT);
    for (const line of orderLines(order)) {
      s.netGoodsPln += line.netPln;
      if (line.marginPln === null) continue;
      s.marginPln += line.marginPln;
      s.coveredNetPln += line.netPln;
    }
  }
  return s;
}

/** Share of net goods revenue whose margin is known, 0–100 */
export const coveragePercent = (s: ProfitSummary) =>
  s.netGoodsPln ? Math.round((s.coveredNetPln / s.netGoodsPln) * 100) : 100;

/** Margin as % of the covered net revenue */
export const marginPercent = (s: ProfitSummary) =>
  s.coveredNetPln ? Math.round((s.marginPln / s.coveredNetPln) * 100) : null;

/** Goods margin + delivery fees − costs entered by hand (all net) */
export const resultPln = (s: ProfitSummary, expensesPln: number) =>
  s.marginPln + s.netShippingPln - expensesPln;

/**
 * Marketing efficiency ratio: all sales ÷ all ad spend (gross sales, net spend,
 * as the ads panels report). Null without spend.
 */
export const mer = (revenuePln: number, adSpendPln: number) =>
  adSpendPln > 0 ? Math.round((revenuePln / adSpendPln) * 10) / 10 : null;

export type ProductProfit = {
  key: string;
  productName: string;
  quantity: number;
  netPln: number;
  marginPln: number | null;
};

/** Lines grouped by variant (by name for deleted variants), best margin first */
export function profitByProduct(orders: ProfitOrder[]): ProductProfit[] {
  const map = new Map<string, ProductProfit>();
  for (const line of orders.flatMap(orderLines)) {
    const key = line.variantId ?? line.productName;
    const p = map.get(key) ?? {
      key,
      productName: line.productName,
      quantity: 0,
      netPln: 0,
      marginPln: 0,
    };
    p.quantity += line.quantity;
    p.netPln += line.netPln;
    p.marginPln =
      p.marginPln === null || line.marginPln === null ? null : p.marginPln + line.marginPln;
    map.set(key, p);
  }
  return [...map.values()].sort(
    (a, b) => (b.marginPln ?? -Infinity) - (a.marginPln ?? -Infinity) || b.netPln - a.netPln,
  );
}

type SelectedOrder = Omit<ProfitOrder, "items"> & {
  items: (Omit<ProfitItem, "vatRate" | "unitCostPln"> & {
    vatRate: { toString(): string };
    unitCostPln: number | null;
    variant: { costPricePln: number | null } | null;
  })[];
};

/** Order rows from `profitOrderSelect` → ProfitOrder; old orders fall back to today's cost */
export const toProfitOrder = ({ items, ...o }: SelectedOrder): ProfitOrder => ({
  ...o,
  items: items.map(({ variant, vatRate, unitCostPln, ...i }) => ({
    ...i,
    vatRate: Number(vatRate.toString()),
    unitCostPln: unitCostPln ?? variant?.costPricePln ?? null,
  })),
});

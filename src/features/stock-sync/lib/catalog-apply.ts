import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CatalogItem, CatalogSnapshot } from "../schema";
import { planCostUpdates, planPriceUpdates } from "./catalog-plan";
import { groupByValue, variantIndex } from "./plan";

const CHUNK = 2000;

function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

function toRow(locationId: string, item: CatalogItem): Prisma.SubiektProductCreateManyInput {
  return {
    locationId,
    symbol: item.symbol,
    ean: item.ean || null,
    name: item.name,
    unit: item.unit ?? null,
    vatRate: item.vatRate ?? null,
    purchaseNetPln: item.purchaseNet ?? null,
    pricesGrossPln: item.pricesGross,
    weightGrams: item.weightGrams ?? null,
    supplierSymbol: item.supplierSymbol ?? null,
    supplierName: item.supplierName ?? null,
    supplierProductCode: item.supplierProductCode ?? null,
    minStock: item.minStock ?? null,
    // Subiekt's local time without a zone; the date is what matters
    lastDeliveryAt: item.lastDeliveryAt ? new Date(`${item.lastDeliveryAt.slice(0, 19)}Z`) : null,
    lastDeliveryNetPln: item.lastDeliveryNet ?? null,
    blocked: item.blocked,
  };
}

export type CatalogResult = {
  ok: true;
  stored: number;
  removed: number;
  costsUpdated: number;
  costsToReview: number;
  costGuard: string | null;
  pricesUpdated: number;
  pricesToReview: number;
  priceGuard: string | null;
  /** Products whose sale price moved — their pages, listings and Merchant offers need a refresh */
  priceChangedProducts: { id: string; slug: string }[];
};

/**
 * Stores one location's Subiekt cards (full = replace all, delta = replace the
 * changed ones and drop the removed) and copies purchase prices onto matched
 * variants, within the safeguards of planCostUpdates, and sale prices
 * within those of planPriceUpdates.
 */
export async function applyCatalog(
  code: string,
  snapshot: CatalogSnapshot,
): Promise<CatalogResult> {
  const location = await prisma.stockLocation.upsert({
    where: { code },
    create: { code, name: code },
    update: {},
  });
  const rows = snapshot.items.map((item) => toRow(location.id, item));
  const removed = snapshot.removed ?? [];

  await prisma.$transaction(
    async (tx) => {
      if (snapshot.mode === "full") {
        await tx.subiektProduct.deleteMany({ where: { locationId: location.id } });
      } else {
        const symbols = [...rows.map((r) => r.symbol), ...removed];
        for (const part of chunks(symbols)) {
          await tx.subiektProduct.deleteMany({
            where: { locationId: location.id, symbol: { in: part } },
          });
        }
      }
      for (const part of chunks(rows)) {
        await tx.subiektProduct.createMany({ data: part, skipDuplicates: true });
      }
      await tx.stockLocation.update({
        where: { id: location.id },
        data: {
          catalogSyncedAt: new Date(),
          ...(snapshot.levelNames ? { priceLevelNames: snapshot.levelNames } : {}),
        },
      });
    },
    // A first full snapshot is ~20k cards
    { timeout: 120_000 },
  );

  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      sku: true,
      ean: true,
      costPricePln: true,
      pricePln: true,
      comparePricePln: true,
      vatRate: true,
    },
  });
  const plan = planCostUpdates(snapshot.items, variantIndex(variants), variants);
  for (const [cost, ids] of groupByValue(plan.apply)) {
    for (const part of chunks(ids)) {
      await prisma.productVariant.updateMany({
        where: { id: { in: part } },
        data: { costPricePln: cost },
      });
    }
  }
  if (plan.guard) console.warn(`[subiekt-catalog] ${code}: ${plan.guard} — not applied`);

  // The floor uses the costs just accepted, not ones held back for review
  const priced = variants.map((v) => ({
    ...v,
    vatRate: Number(v.vatRate),
    costPricePln: plan.apply.get(v.id) ?? v.costPricePln,
  }));
  const prices = planPriceUpdates(snapshot.items, variantIndex(variants), priced);
  for (const [price, ids] of groupByValue(prices.apply)) {
    for (const part of chunks(ids)) {
      await prisma.productVariant.updateMany({
        where: { id: { in: part } },
        data: { pricePln: price },
      });
    }
  }
  if (prices.guard) console.warn(`[subiekt-catalog] ${code}: ${prices.guard} — not applied`);
  const priceChangedProducts =
    prices.apply.size === 0
      ? []
      : await prisma.product.findMany({
          where: { variants: { some: { id: { in: [...prices.apply.keys()] } } } },
          select: { id: true, slug: true },
        });

  return {
    ok: true,
    stored: rows.length,
    removed: removed.length,
    costsUpdated: plan.apply.size,
    costsToReview: plan.review.length,
    costGuard: plan.guard,
    pricesUpdated: prices.apply.size,
    pricesToReview: prices.review.length,
    priceGuard: prices.guard,
    priceChangedProducts,
  };
}

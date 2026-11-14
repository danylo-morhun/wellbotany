import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CatalogItem, CatalogSnapshot } from "../schema";
import { planCostUpdates } from "./catalog-plan";
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
};

/**
 * Stores one location's Subiekt cards (full = replace all, delta = replace the
 * changed ones and drop the removed) and copies purchase prices onto matched
 * variants, within the safeguards of planCostUpdates.
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
    select: { id: true, sku: true, ean: true, costPricePln: true },
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

  return {
    ok: true,
    stored: rows.length,
    removed: removed.length,
    costsUpdated: plan.apply.size,
    costsToReview: plan.review.length,
    costGuard: plan.guard,
  };
}

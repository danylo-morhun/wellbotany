import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StockSnapshot } from "../schema";
import { diffLevels, groupByValue, matchItems, onlineStock, rejectReason } from "./plan";

// Postgres caps bind parameters at 32767 — keep every IN list well below it
const CHUNK = 5000;
const UNMATCHED_SAMPLE = 50;

function chunks<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

export type ApplyResult =
  | {
      ok: true;
      changedLevels: number;
      changedVariants: number;
      unmatched: number;
      restockedOrSoldOut: string[];
    }
  | { ok: false; error: string };

/**
 * Stores one location's Subiekt snapshot and recomputes ProductVariant.stock
 * for the variants it touches. Rejected snapshots are logged and change nothing.
 */
export async function applySnapshot(code: string, snapshot: StockSnapshot): Promise<ApplyResult> {
  const location = await prisma.stockLocation.upsert({
    where: { code },
    create: { code, name: code },
    update: {},
  });

  const variants = await prisma.productVariant.findMany({
    select: { id: true, sku: true, ean: true },
  });
  const { quantities, unmatched } = matchItems(snapshot.items, variants);

  const existing = await prisma.stockLevel.findMany({
    where: { locationId: location.id },
    select: { variantId: true, quantity: true },
  });
  const current = new Map(existing.map((l) => [l.variantId, l.quantity]));
  const changes = diffLevels(snapshot.mode, current, quantities);

  const run = {
    locationId: location.id,
    mode: snapshot.mode,
    agentVersion: snapshot.agentVersion,
    received: snapshot.items.length,
    matched: quantities.size,
    unmatched: unmatched.length,
    unmatchedSample: unmatched
      .slice(0, UNMATCHED_SAMPLE)
      .map(({ symbol, ean }) => ({ symbol, ean: ean ?? null })),
  };

  const error = rejectReason(snapshot.mode, quantities.size, current, changes);
  if (error) {
    await prisma.syncRun.create({ data: { ...run, changedLevels: 0, changedVariants: 0, error } });
    return { ok: false, error };
  }

  // A full snapshot also re-applies safety stock / sellsOnline edits to everything it covers
  const recompute =
    snapshot.mode === "full"
      ? [...new Set([...current.keys(), ...quantities.keys()])]
      : [...changes.keys()];

  return prisma.$transaction(
    async (tx) => {
      const created = [...changes].filter(([id]) => !current.has(id));
      const updated = new Map([...changes].filter(([id]) => current.has(id)));
      for (const part of chunks(created)) {
        await tx.stockLevel.createMany({
          data: part.map(([variantId, quantity]) => ({
            locationId: location.id,
            variantId,
            quantity,
          })),
        });
      }
      for (const [quantity, ids] of groupByValue(updated)) {
        for (const part of chunks(ids)) {
          await tx.stockLevel.updateMany({
            where: { locationId: location.id, variantId: { in: part } },
            data: { quantity },
          });
        }
      }

      const { changedVariants, restockedOrSoldOut } = await recomputeStock(tx, recompute);

      await tx.stockLocation.update({
        where: { id: location.id },
        data: { lastSyncAt: new Date() },
      });
      await tx.syncRun.create({ data: { ...run, changedLevels: changes.size, changedVariants } });

      return {
        ok: true as const,
        changedLevels: changes.size,
        changedVariants,
        unmatched: unmatched.length,
        restockedOrSoldOut,
      };
    },
    { timeout: 30_000 },
  );
}

/**
 * ProductVariant.stock = synced levels − safety stock − web orders not yet in
 * Subiekt. Variants with trackStock off keep their manual stock.
 */
async function recomputeStock(tx: Prisma.TransactionClient, variantIds: string[]) {
  const targets = new Map<string, number>();
  const before = new Map<string, { stock: number; productId: string }>();

  for (const part of chunks(variantIds)) {
    const [levels, pending, rows] = await Promise.all([
      tx.stockLevel.findMany({
        where: { variantId: { in: part } },
        select: {
          variantId: true,
          quantity: true,
          location: { select: { sellsOnline: true, safetyStock: true } },
        },
      }),
      tx.orderItem.groupBy({
        by: ["variantId"],
        where: {
          variantId: { in: part },
          order: { subiektEnteredAt: null, status: { notIn: ["PENDING", "CANCELLED"] } },
        },
        _sum: { quantity: true },
      }),
      tx.productVariant.findMany({
        where: { id: { in: part }, trackStock: true },
        select: { id: true, stock: true, productId: true },
      }),
    ]);

    const levelsOf = new Map<
      string,
      { quantity: number; sellsOnline: boolean; safetyStock: number }[]
    >();
    for (const l of levels) {
      const list = levelsOf.get(l.variantId) ?? [];
      list.push({ quantity: l.quantity, ...l.location });
      levelsOf.set(l.variantId, list);
    }
    const pendingOf = new Map(pending.map((p) => [p.variantId, p._sum.quantity ?? 0]));

    for (const v of rows) {
      const target = onlineStock(levelsOf.get(v.id) ?? [], pendingOf.get(v.id) ?? 0);
      if (target !== v.stock) {
        targets.set(v.id, target);
        before.set(v.id, v);
      }
    }
  }

  // Grouped by (old, new) and conditional on the old value: a checkout that
  // took stock meanwhile wins, and the next sync settles the variant.
  const pairs = new Map<string, string[]>();
  for (const [id, target] of targets) {
    const key = `${before.get(id)?.stock}:${target}`;
    pairs.set(key, [...(pairs.get(key) ?? []), id]);
  }
  let changedVariants = 0;
  for (const [key, ids] of pairs) {
    const [from, to] = key.split(":").map(Number);
    for (const part of chunks(ids)) {
      const { count } = await tx.productVariant.updateMany({
        where: { id: { in: part }, stock: from },
        data: { stock: to },
      });
      changedVariants += count;
    }
  }

  // Products whose availability flipped — Merchant Center needs to hear about these
  const restockedOrSoldOut = new Set<string>();
  for (const [id, target] of targets) {
    const prev = before.get(id);
    if (prev && prev.stock > 0 !== target > 0) restockedOrSoldOut.add(prev.productId);
  }
  return { changedVariants, restockedOrSoldOut: [...restockedOrSoldOut] };
}

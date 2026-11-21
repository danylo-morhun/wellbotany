// Pure steps of the Subiekt catalog sync — no DB access, unit-tested.
import type { CatalogItem } from "../schema";
import { findVariant, type VariantIndex } from "./plan";

// A purchase price moving more than this at once is more likely a typo in
// Subiekt (or a different pack size) than a real price change
export const COST_MAX_CHANGE = 0.5;
// Many costs changing in one snapshot = a broken query or a mass edit — a human looks first
const GUARD_MIN_CHANGES = 20;
const GUARD_MAX_SHARE = 0.5;

export type CostReviewReason = "change-too-large" | "ambiguous";

export type CostPlan = {
  /** variantId → new costPricePln */
  apply: Map<string, number>;
  review: {
    variantId: string;
    current: number | null;
    incoming: number;
    reason: CostReviewReason;
  }[];
  /** Set when the bulk guard held back every change (fills of empty costs still apply) */
  guard: string | null;
};

type VariantCost = { id: string; costPricePln: number | null };

/**
 * New purchase costs from Subiekt (tc_CenaNetto0, net) for our variants.
 * Subiekt is the source of truth where it has a price; a missing or zero one
 * never clears ours (435 site products aren't in Subiekt, 87 have 0 there).
 */
export function planCostUpdates(
  items: CatalogItem[],
  index: VariantIndex,
  variants: VariantCost[],
): CostPlan {
  const current = new Map(variants.map((v) => [v.id, v.costPricePln]));

  // Two Subiekt cards on one variant with different prices — don't guess
  const incoming = new Map<string, number | null>();
  for (const item of items) {
    if (!item.purchaseNet) continue;
    const id = findVariant(index, item);
    if (!id || !current.has(id)) continue;
    const seen = incoming.get(id);
    incoming.set(id, seen === undefined || seen === item.purchaseNet ? item.purchaseNet : null);
  }

  const fills = new Map<string, number>();
  const changes = new Map<string, number>();
  const review: CostPlan["review"] = [];
  for (const [id, cost] of incoming) {
    const now = current.get(id) ?? null;
    if (cost === null) {
      const prices = items.filter((i) => findVariant(index, i) === id && i.purchaseNet);
      review.push({
        variantId: id,
        current: now,
        incoming: prices[0]?.purchaseNet ?? 0,
        reason: "ambiguous",
      });
    } else if (now === null) {
      fills.set(id, cost);
    } else if (now !== cost) {
      if (Math.abs(cost - now) / now > COST_MAX_CHANGE) {
        review.push({ variantId: id, current: now, incoming: cost, reason: "change-too-large" });
      } else {
        changes.set(id, cost);
      }
    }
  }

  const withCost = variants.filter((v) => v.costPricePln !== null).length;
  const guard =
    changes.size >= GUARD_MIN_CHANGES && changes.size / Math.max(1, withCost) > GUARD_MAX_SHARE
      ? `catalog would change ${changes.size} of ${withCost} purchase costs at once`
      : null;

  return { apply: guard ? fills : new Map([...fills, ...changes]), review, guard };
}

// Site sale price floor: purchase cost + 30 % margin (owner 2026-11-21). Subiekt's
// retail levels are not reliable, so they no longer set our prices; a price at or
// above the floor is left as is, one below it is raised to the floor.
export const MIN_MARGIN = 0.3;
// Same reasoning as costs: a jump this big is likelier a typo or a pack-size mix-up
export const PRICE_MAX_CHANGE = 0.5;
// Black Week runs until 30.11 and its Omnibus badges use the 30-day low:
// before this date the sync leaves every sale price alone
export const PRICE_FLOOR_START = new Date("2026-12-01T00:00:00+01:00");

/** Lowest gross sale price (grosz) that keeps MIN_MARGIN on a net cost. */
export function marginFloor(costNet: number, vatRate: number): number {
  // Whole-percent integer math: 700 / 0.7 in floats is 1000.0000000000001
  return Math.ceil((costNet * (100 + vatRate)) / Math.round((1 - MIN_MARGIN) * 100));
}

export type PricePlan = {
  /** variantId → new pricePln (gross, grosz) */
  apply: Map<string, number>;
  review: {
    variantId: string;
    current: number;
    incoming: number;
    reason: "change-too-large";
  }[];
  /** Set when the bulk guard held back every change */
  guard: string | null;
};

type VariantPrice = {
  id: string;
  pricePln: number;
  comparePricePln: number | null;
  /** Cost after this snapshot's cost plan was applied */
  costPricePln: number | null;
  vatRate: number;
};

/**
 * Raises sale prices below the margin floor, for variants this snapshot matched.
 * Never lowers a price. Never touches a variant with a running site promotion
 * (comparePricePln set): moving its price would break the Omnibus "lowest price
 * in 30 days" shown next to it. No cost → no floor.
 */
export function planPriceUpdates(
  items: CatalogItem[],
  index: VariantIndex,
  variants: VariantPrice[],
  now = new Date(),
): PricePlan {
  if (now < PRICE_FLOOR_START) return { apply: new Map(), review: [], guard: null };
  const current = new Map(variants.map((v) => [v.id, v]));
  const matched = new Set<string>();
  for (const item of items) {
    const id = findVariant(index, item);
    if (id) matched.add(id);
  }

  const changes = new Map<string, number>();
  const review: PricePlan["review"] = [];
  for (const id of matched) {
    const variant = current.get(id);
    if (!variant || variant.comparePricePln !== null || !variant.costPricePln) continue;
    const now = variant.pricePln;
    const floor = marginFloor(variant.costPricePln, variant.vatRate);
    if (now >= floor) continue;
    if (now > 0 && (floor - now) / now > PRICE_MAX_CHANGE) {
      review.push({ variantId: id, current: now, incoming: floor, reason: "change-too-large" });
    } else {
      changes.set(id, floor);
    }
  }

  // Share of all priced variants, not of this snapshot: a delta holds only changed
  // cards, so a normal batch of edits in Subiekt would look like 100 % changes
  const priced = variants.filter((v) => v.pricePln > 0).length;
  const guard =
    changes.size >= GUARD_MIN_CHANGES && changes.size / Math.max(1, priced) > GUARD_MAX_SHARE
      ? `catalog would change ${changes.size} of ${priced} sale prices at once`
      : null;

  return { apply: guard ? new Map() : changes, review, guard };
}

export type ReportVariant = {
  id: string;
  sku: string;
  ean: string | null;
  pricePln: number;
  costPricePln: number | null;
  vatRate: number;
  weightGrams: number | null;
};

export type ReportCard = {
  symbol: string;
  ean: string | null;
  name: string;
  vatRate: number | null;
  purchaseNetPln: number | null;
  pricesGrossPln: number[];
  weightGrams: number | null;
  lastDeliveryNetPln: number | null;
  blocked: boolean;
};

export type Pair<V extends ReportVariant, C extends ReportCard> = { variant: V; card: C };

/** Our variants with their Subiekt card (first match wins), plus variants Subiekt doesn't have. */
export function pairVariants<V extends ReportVariant, C extends ReportCard>(
  variants: V[],
  cards: C[],
  index: VariantIndex,
) {
  const byVariant = new Map<string, C>();
  for (const card of cards) {
    const id = findVariant(index, card);
    if (id && !byVariant.has(id)) byVariant.set(id, card);
  }
  const pairs: Pair<V, C>[] = [];
  const missing: V[] = [];
  for (const variant of variants) {
    const card = byVariant.get(variant.id);
    if (card) pairs.push({ variant, card });
    else missing.push(variant);
  }
  return { pairs, missing };
}

/** The report's views, each a list of pairs. level: 1-based Subiekt price level. */
export function compareCatalog<V extends ReportVariant, C extends ReportCard>(
  pairs: Pair<V, C>[],
  level: number,
) {
  const price = (c: C) => c.pricesGrossPln[level - 1] ?? 0;
  return {
    prices: pairs.filter((p) => price(p.card) > 0 && price(p.card) !== p.variant.pricePln),
    costs: pairs.filter(
      (p) =>
        (p.card.purchaseNetPln !== null && p.card.purchaseNetPln !== p.variant.costPricePln) ||
        (p.card.purchaseNetPln === null &&
          p.card.lastDeliveryNetPln !== null &&
          p.variant.costPricePln === null),
    ),
    vat: pairs.filter((p) => p.card.vatRate !== null && p.card.vatRate !== p.variant.vatRate),
    weight: pairs.filter((p) => p.variant.weightGrams === null && p.card.weightGrams !== null),
    blocked: pairs.filter((p) => p.card.blocked),
  };
}

/** Signed change from ours to Subiekt's, in percent of ours (1 decimal). */
export function percentChange(ours: number, theirs: number): number {
  return ours === 0 ? 0 : Math.round(((theirs - ours) / ours) * 1000) / 10;
}

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

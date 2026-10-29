// Pure steps of applying a Subiekt snapshot — no DB access, unit-tested.
import type { StockItem, StockSnapshot } from "../schema";

type VariantKey = { id: string; sku: string; ean: string | null };

const normalizeEan = (ean: string | null | undefined) => ean?.replace(/\D/g, "") || null;
const EAN_LIKE = /^\d{8,14}$/;

// Subiekt cards (tw_Symbol) carrying another product's barcode — never matched,
// so the site variant with that barcode keeps its manual stock. Remove an entry
// once the card is fixed in Subiekt.
export const IGNORED_SYMBOLS = new Set([
  "5904139923962", // "Tran norweski" (Osavi) with Dr. Jacob's Magnez barcode 4041246500219
  "5903263262305", // "Zmiana" — retired card still holding Singularis Acerola Organic barcode
  "5900672150995", // Kenay Turmeric 200 g holding the 100 g barcode 5900672150988
  "5903148622033", // BIOCAPS C Complex Max 60 kaps; symbol equals BICAPS Witamina C 45 sasz. barcode
]);

/**
 * Subiekt products → our variants: EAN first, then tw_Symbol = sku (case-insensitive),
 * then tw_Symbol = our EAN (shops often keep the barcode in the symbol, not in tw_PodstKodKresk).
 * Two Subiekt products landing on one variant are summed.
 */
export function matchItems(items: StockItem[], variants: VariantKey[]) {
  const byEan = new Map<string, string>();
  const bySku = new Map<string, string>();
  for (const v of variants) {
    const ean = normalizeEan(v.ean);
    if (ean) byEan.set(ean, v.id);
    bySku.set(v.sku.trim().toLowerCase(), v.id);
  }

  const quantities = new Map<string, number>();
  const unmatched: StockItem[] = [];
  for (const item of items) {
    if (IGNORED_SYMBOLS.has(item.symbol)) {
      unmatched.push(item);
      continue;
    }
    const ean = normalizeEan(item.ean);
    const id =
      (ean && byEan.get(ean)) ||
      bySku.get(item.symbol.toLowerCase()) ||
      (EAN_LIKE.test(item.symbol) ? byEan.get(item.symbol) : undefined);
    if (!id) {
      unmatched.push(item);
      continue;
    }
    // Subiekt can go negative (sold before the delivery was booked) — that's 0 for us
    quantities.set(id, (quantities.get(id) ?? 0) + Math.max(0, item.quantity));
  }
  return { quantities, unmatched };
}

/** New quantity per variant, only where it differs from what we hold. */
export function diffLevels(
  mode: StockSnapshot["mode"],
  current: Map<string, number>,
  incoming: Map<string, number>,
): Map<string, number> {
  const changes = new Map<string, number>();
  for (const [id, qty] of incoming) {
    if (current.get(id) !== qty) changes.set(id, qty);
  }
  if (mode === "full") {
    // Gone from Subiekt (deleted, blocked) — nothing left to sell
    for (const [id, qty] of current) {
      if (!incoming.has(id) && qty !== 0) changes.set(id, 0);
    }
  }
  return changes;
}

// Below this many in-stock variants the share check is too noisy to mean anything
const GUARD_MIN_IN_STOCK = 20;
const GUARD_MAX_ZEROED_SHARE = 0.5;

/**
 * Refuses snapshots that look broken rather than real: a full one with no
 * matched products, or one that empties most of the shelf at once (a query
 * broken by a Subiekt update returns zeros, not an error). null = fine.
 * inStockTotal: in-stock levels of the whole location, when `current` holds
 * only the levels a delta touches.
 */
export function rejectReason(
  mode: StockSnapshot["mode"],
  matched: number,
  current: Map<string, number>,
  changes: Map<string, number>,
  inStockTotal?: number,
): string | null {
  if (mode === "full" && matched === 0) return "full snapshot matched no products";
  let inStockSeen = 0;
  let zeroed = 0;
  for (const [id, qty] of current) {
    if (qty <= 0) continue;
    inStockSeen++;
    if (changes.get(id) === 0) zeroed++;
  }
  const inStock = inStockTotal ?? inStockSeen;
  if (inStock >= GUARD_MIN_IN_STOCK && zeroed / inStock > GUARD_MAX_ZEROED_SHARE) {
    return `snapshot would zero ${zeroed} of ${inStock} in-stock variants`;
  }
  return null;
}

type Level = { quantity: number; sellsOnline: boolean; safetyStock: number };

/**
 * What the site may sell: every online location minus its safety stock,
 * minus web orders Subiekt doesn't know about yet.
 */
export function onlineStock(levels: Level[], pending: number): number {
  let sum = 0;
  for (const l of levels) {
    if (l.sellsOnline) sum += Math.max(0, l.quantity - l.safetyStock);
  }
  return Math.max(0, sum - pending);
}

/** { id → value } → { value → ids }, so each distinct value is one updateMany */
export function groupByValue(values: Map<string, number>): Map<number, string[]> {
  const groups = new Map<number, string[]>();
  for (const [id, value] of values) {
    const ids = groups.get(value);
    if (ids) ids.push(id);
    else groups.set(value, [id]);
  }
  return groups;
}

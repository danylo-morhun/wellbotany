import type { NutritionRow } from "@/features/products/lib/nutrition-facts";

/** First rows of a supplement table for the buy-box summary; "w tym …" sub-rows are skipped. */
export function keyIngredientRows(rows: NutritionRow[], limit = 3): NutritionRow[] {
  return rows.filter((row) => !/^w tym/i.test(row.name.trim())).slice(0, limit);
}

const squash = (s: string) => s.toLowerCase().replace(/[\s.,]+/g, "");

/**
 * Compact comparison line for a product card ("60 kaps. · 1 kapsułka dziennie").
 * Drops the pack size when the name already says it; null when nothing is left.
 */
export function cardMetaLine(product: {
  namePl: string;
  netWeight?: string | null;
  servingSize?: string | null;
}): string | null {
  const net = product.netWeight?.trim();
  const serving = product.servingSize?.trim();
  const parts = [
    net && !squash(product.namePl).includes(squash(net)) ? net : null,
    serving || null,
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : null;
}

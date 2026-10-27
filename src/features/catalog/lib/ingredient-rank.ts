export type IngredientChip = { slug: string; namePl: string; productCount: number };

type IngredientTerms = {
  slug: string;
  namePl: string;
  matchTerms: string[];
  excludeTerms: string[];
};

/**
 * Ingredients by how many product names they match, most first — the same
 * rule as the ingredient page's product list (any match term, no exclude
 * term, case-insensitive). Ingredients with no products are left out.
 */
export function rankIngredientsByProducts(
  ingredients: IngredientTerms[],
  productNames: string[],
  limit: number,
): IngredientChip[] {
  const names = productNames.map((n) => n.toLocaleLowerCase("pl"));
  const lower = (terms: string[]) =>
    terms.map((t) => t.trim().toLocaleLowerCase("pl")).filter(Boolean);
  return ingredients
    .map((i) => {
      const match = lower(i.matchTerms);
      const exclude = lower(i.excludeTerms);
      const productCount = names.filter(
        (n) => match.some((t) => n.includes(t)) && !exclude.some((t) => n.includes(t)),
      ).length;
      return { slug: i.slug, namePl: i.namePl, productCount };
    })
    .filter((i) => i.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount || a.namePl.localeCompare(b.namePl, "pl"))
    .slice(0, limit);
}

/**
 * "Podobne produkty" ranking — pure, so it can be unit-tested without a DB.
 *
 * Tags carry no signal here (no product has any), and a category like
 * "witaminy-i-mineraly" holds 260+ items, so category alone ranks at random.
 * The strongest signal is the active ingredient in the name ("Magnez",
 * "Witamina K2", "Omega-3"), then the category, then the brand.
 */

export type RelatedCandidate = {
  id: string;
  namePl: string;
  categoryId: string | null;
  categoryParentId: string | null;
  brandId: string | null;
  brandParentId: string | null;
  /** Brand/product-line name — its words ("BICAPS") say nothing about the ingredient */
  brandName: string | null;
  hasImage: boolean;
  inStock: boolean;
};

export type RelatedSeed = Omit<RelatedCandidate, "hasImage" | "inStock">;

// Pack/dose/form words — they match across unrelated products ("60 kaps.").
const STOPWORDS = new Set([
  "dla",
  "oraz",
  "kaps",
  "kapsulki",
  "kapsulek",
  "kapsulkach",
  "tabl",
  "tabletki",
  "tabletek",
  "tab",
  "sasz",
  "saszetek",
  "saszetki",
  "proszek",
  "plyn",
  "krople",
  "kropli",
  "szt",
  "opak",
  "forte",
  "max",
  "plus",
  "extra",
  "premium",
  "suplement",
  "diety",
  "mse",
  "enzmann",
  "vege",
]);

const VITAMIN_WORDS = new Set(["witamina", "witaminy", "witamin", "vitamin"]);

const isKeyword = (w: string) =>
  !STOPWORDS.has(w) && (/^[a-z]{3,}$/.test(w) || /^[a-z]{1,2}\d{1,3}$/.test(w));

/**
 * Ingredient-bearing words of a product name, diacritics stripped. "Witamina X"
 * becomes one token ("witamina-c"), so Witamina C and Witamina K2 don't look
 * alike just because both say "witamina".
 */
export function nameTokens(name: string): Set<string> {
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const tokens = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = words[i + 1];
    if (VITAMIN_WORDS.has(w) && next) {
      tokens.add(`witamina-${next}`);
    } else if (isKeyword(w)) {
      tokens.add(w);
    }
  }
  return tokens;
}

/** Name tokens minus the brand's own words. */
export function ingredientTokens(p: { namePl: string; brandName: string | null }): Set<string> {
  const tokens = nameTokens(p.namePl);
  for (const t of nameTokens(p.brandName ?? "")) tokens.delete(t);
  return tokens;
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

// Same brand + near-identical name = the same product in another pack size.
// One is useful ("also in 120 kaps."); four of them is not a recommendation.
const SAME_PRODUCT_OVERLAP = 0.8;
const MAX_SAME_PRODUCT = 1;

export function rankRelated(
  seed: RelatedSeed,
  candidates: RelatedCandidate[],
  take: number,
): string[] {
  const seedTokens = ingredientTokens(seed);
  const brandFamily = (c: { brandId: string | null; brandParentId: string | null }) =>
    c.brandParentId ?? c.brandId;

  const scored = candidates
    .filter((c) => c.id !== seed.id)
    .map((c) => {
      const nameScore = overlap(seedTokens, ingredientTokens(c));
      const sameCategory = seed.categoryId != null && c.categoryId === seed.categoryId;
      const siblingCategory =
        !sameCategory &&
        seed.categoryParentId != null &&
        c.categoryParentId === seed.categoryParentId;
      const sameBrand = seed.brandId != null && c.brandId === seed.brandId;
      const sameBrandFamily =
        !sameBrand && brandFamily(seed) != null && brandFamily(c) === brandFamily(seed);
      const score =
        nameScore * 6 +
        (sameCategory ? 3 : siblingCategory ? 1.5 : 0) +
        (sameBrand ? 1 : sameBrandFamily ? 0.5 : 0) +
        (c.hasImage ? 1 : -3) +
        (c.inStock ? 0.5 : 0);
      const isSameProduct = sameBrand && nameScore >= SAME_PRODUCT_OVERLAP;
      return { id: c.id, score, isSameProduct };
    })
    .sort((a, b) => b.score - a.score);

  const picked: string[] = [];
  let sameProductCount = 0;
  for (const c of scored) {
    if (picked.length === take) break;
    if (c.isSameProduct) {
      if (sameProductCount >= MAX_SAME_PRODUCT) continue;
      sameProductCount++;
    }
    picked.push(c.id);
  }
  return picked;
}

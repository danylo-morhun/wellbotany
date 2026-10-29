// The schema has no product type — the primary category tells it. Supplement
// trees use the TYPE / NEED / AUDIENCE groups; everything else sits under OTHER
// (kosmetyki, akcesoria, książki, żywność…).
export type ProductKind = "supplement" | "food" | "nonFood";

export type KindCategory = {
  slug: string;
  group: string;
  parent: { slug: string } | null;
} | null;

// OTHER roots that are still food (FIC 1169/2011), not GPSR products
const FOOD_ROOTS = new Set(["zywnosc"]);

/** Uncategorised products count as supplements — the shop's default. */
export function productKind(category: KindCategory): ProductKind {
  if (category?.group !== "OTHER") return "supplement";
  const root = category.parent?.slug ?? category.slug;
  return FOOD_ROOTS.has(root) ? "food" : "nonFood";
}

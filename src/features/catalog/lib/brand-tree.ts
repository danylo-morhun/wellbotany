/** Flat brand row shape needed for tree computations — decoupled from the public, already-tree-shaped `BrandItem` returned by `getBrands()`. */
export type BrandNode = {
  id: string;
  slug: string;
  parentBrandId: string | null;
  _count: { products: number };
};

function buildBrandChildrenMap<T extends BrandNode>(brands: T[]): Map<string, T[]> {
  const byParent = new Map<string, T[]>();
  for (const b of brands) {
    if (!b.parentBrandId) continue;
    const siblings = byParent.get(b.parentBrandId) ?? [];
    siblings.push(b);
    byParent.set(b.parentBrandId, siblings);
  }
  return byParent;
}

/** Parent brands (e.g. Formeds) hold no products directly — their count is the sum of their whole subtree, not just `_count.products`. */
export function computeBrandSubtreeCounts<T extends BrandNode>(brands: T[]): Map<string, number> {
  const byParent = buildBrandChildrenMap(brands);

  const counts = new Map<string, number>();
  function total(brand: T): number {
    const cached = counts.get(brand.id);
    if (cached !== undefined) return cached;
    let sum = brand._count.products;
    for (const child of byParent.get(brand.id) ?? []) sum += total(child);
    counts.set(brand.id, sum);
    return sum;
  }
  for (const b of brands) total(b);
  return counts;
}

function collectBrandSubtreeIds<T extends BrandNode>(
  rootId: string,
  byParent: Map<string, T[]>,
): string[] {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || ids.has(id)) continue;
    ids.add(id);
    for (const child of byParent.get(id) ?? []) stack.push(child.id);
  }
  return [...ids];
}

/** A brand page (e.g. `/marki/formeds`) must include products from its whole subtree, not just direct hits — parent brands hold no products of their own. Accepts multiple slugs and returns the union of their subtrees, deduped. */
export function getBrandSubtreeIds<T extends BrandNode>(brands: T[], slugs: string[]): string[] {
  const roots = slugs.flatMap((slug) => {
    const match = brands.find((b) => b.slug === slug);
    return match ? [match.id] : [];
  });
  if (roots.length === 0) return [];

  const byParent = buildBrandChildrenMap(brands);
  const ids = new Set<string>();
  for (const root of roots) {
    for (const id of collectBrandSubtreeIds(root, byParent)) ids.add(id);
  }
  return [...ids];
}

type BrandRef = { name: string; slug: string };

/** The name/slug to show as "the brand" anywhere customer-facing (product card, PDP, search, the GMC feed) — a product's own `brand` relation is often a manufacturer's product line (e.g. ForMeds' BICAPS), which duplicates the product name ("BICAPS" eyebrow over "BICAPS white mulberry+"). Customers know the manufacturer, not the line, so prefer `parentBrand` when set. */
export function resolveDisplayBrand<T extends BrandRef>(
  brand: T & { parentBrand?: BrandRef | null },
): BrandRef {
  return brand.parentBrand ?? brand;
}

type BrandOptionInput = { id: string; name: string; parentBrandId?: string | null };

/** Brands for a <select>: each top-level brand followed by its sub-brands, indented — so a product line (e.g. BICAPS) is picked under its manufacturer. */
export function toBrandOptions(brands: BrandOptionInput[]): { id: string; label: string }[] {
  const byName = [...brands].sort((a, b) => a.name.localeCompare(b.name, "pl"));
  const ids = new Set(brands.map((b) => b.id));
  const isRoot = (b: BrandOptionInput) => !b.parentBrandId || !ids.has(b.parentBrandId);
  return byName
    .filter(isRoot)
    .flatMap((root) => [
      { id: root.id, label: root.name },
      ...byName
        .filter((b) => b.parentBrandId === root.id)
        .map((b) => ({ id: b.id, label: `\u00a0\u00a0— ${b.name}` })),
    ]);
}

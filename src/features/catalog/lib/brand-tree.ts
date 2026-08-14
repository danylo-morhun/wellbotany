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

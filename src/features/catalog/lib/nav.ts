import type { CategoryItem } from "../actions";

export type NavLeaf = { slug: string; namePl: string; href: string };
export type NavColumn = NavLeaf & { children: NavLeaf[] };

export type CategoryNav = {
  supplements: { href: string; namePl: string; columns: NavColumn[] };
  sport: { href: string; namePl: string; children: NavLeaf[] };
  kosmetyki: { href: string; namePl: string };
  zywnosc: { href: string; namePl: string; children: NavLeaf[] };
};

const ROOT_SLUGS = {
  supplements: "suplementy-diety",
  sport: "sport",
  kosmetyki: "kosmetyki",
  zywnosc: "zywnosc-i-przyprawy",
} as const;

function toLeaf(c: CategoryItem): NavLeaf {
  return { slug: c.slug, namePl: c.namePl, href: `/kategoria/${c.slug}` };
}

export function childrenOf(categories: CategoryItem[], parentId: string): CategoryItem[] {
  return [...categories]
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.namePl.localeCompare(b.namePl, "pl"));
}

/** Parent categories (e.g. "Suplementy diety") hold no products directly — their count is the sum of their whole subtree, not just `_count.products`. */
export function computeSubtreeCounts(categories: CategoryItem[]): Map<string, number> {
  const byParent = new Map<string, CategoryItem[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const siblings = byParent.get(c.parentId) ?? [];
    siblings.push(c);
    byParent.set(c.parentId, siblings);
  }

  const counts = new Map<string, number>();
  function total(cat: CategoryItem): number {
    const cached = counts.get(cat.id);
    if (cached !== undefined) return cached;
    let sum = cat._count.products;
    for (const child of byParent.get(cat.id) ?? []) sum += total(child);
    counts.set(cat.id, sum);
    return sum;
  }
  for (const c of categories) total(c);
  return counts;
}

/** Builds the header's department + mega-menu structure from the flat category table. Returns null if the expected department categories are missing (e.g. before seeding). */
export function buildCategoryNav(categories: CategoryItem[]): CategoryNav | null {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const supplementsRoot = bySlug.get(ROOT_SLUGS.supplements);
  const sportRoot = bySlug.get(ROOT_SLUGS.sport);
  const kosmetykiRoot = bySlug.get(ROOT_SLUGS.kosmetyki);
  const zywnoscRoot = bySlug.get(ROOT_SLUGS.zywnosc);
  if (!supplementsRoot || !sportRoot || !kosmetykiRoot || !zywnoscRoot) return null;

  const columns: NavColumn[] = childrenOf(categories, supplementsRoot.id).map((col) => ({
    ...toLeaf(col),
    children: childrenOf(categories, col.id).map(toLeaf),
  }));

  return {
    supplements: { ...toLeaf(supplementsRoot), columns },
    sport: {
      ...toLeaf(sportRoot),
      children: childrenOf(categories, sportRoot.id).map(toLeaf),
    },
    kosmetyki: toLeaf(kosmetykiRoot),
    zywnosc: {
      ...toLeaf(zywnoscRoot),
      children: childrenOf(categories, zywnoscRoot.id).map(toLeaf),
    },
  };
}

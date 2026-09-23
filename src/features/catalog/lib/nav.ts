import type { CategoryItem } from "../actions";

export type NavLeaf = { slug: string; namePl: string; href: string };
/** A titled section renders as a heading + list; an untitled one's links flow on their own. */
export type NavSection = { title?: string; href?: string; links: NavLeaf[] };
export type NavMenu = {
  key: string;
  label: string;
  href: string;
  wide: boolean;
  sections: NavSection[];
};
export type CategoryNav = NavMenu[];

/** Below this a category stays out of the menu and the sitemap, and is noindex — a near-empty listing is a poor landing page. */
export const MIN_LISTED_PRODUCTS = 3;

function toLeaf(c: CategoryItem): NavLeaf {
  return { slug: c.slug, namePl: c.namePl, href: `/kategoria/${c.slug}` };
}

export function childrenOf(categories: CategoryItem[], parentId: string): CategoryItem[] {
  return [...categories]
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.namePl.localeCompare(b.namePl, "pl"));
}

type CategoryNode = { id: string; parentId: string | null };
type CategoryLink = { productId: string; categoryId: string };

/**
 * Distinct products per category, counting its whole subtree. A product can
 * sit in several categories (e.g. "Magnez" and "Na sen"), so summing the
 * children would count it twice under their shared parent.
 */
export function computeSubtreeCounts(
  categories: CategoryNode[],
  links: CategoryLink[],
): Map<string, number> {
  const parentOf = new Map(categories.map((c) => [c.id, c.parentId]));
  const products = new Map<string, Set<string>>();
  for (const { productId, categoryId } of links) {
    // Walk up to the root; the visited guard stops a bad parent cycle.
    const seen = new Set<string>();
    for (
      let id: string | null | undefined = categoryId;
      id && !seen.has(id);
      id = parentOf.get(id)
    ) {
      seen.add(id);
      const set = products.get(id) ?? new Set<string>();
      set.add(productId);
      products.set(id, set);
    }
  }
  return new Map(categories.map((c) => [c.id, products.get(c.id)?.size ?? 0]));
}

/**
 * Header menus from the category table, one per menu group: "Suplementy"
 * (what it is — TYPE roots with their children), "Na co?" (NEED + AUDIENCE),
 * then each OTHER root with children; OTHER roots without children share
 * the last "Więcej" section. Categories below MIN_LISTED_PRODUCTS are left out.
 */
export function buildCategoryNav(categories: CategoryItem[]): CategoryNav {
  const listed = categories.filter((c) => c.productCount >= MIN_LISTED_PRODUCTS);
  const roots = (group: CategoryItem["group"]) =>
    listed
      .filter((c) => c.parentId === null && c.group === group)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.namePl.localeCompare(b.namePl, "pl"));

  const typeSections = roots("TYPE").map((root) => ({
    title: root.namePl,
    href: `/kategoria/${root.slug}`,
    links: childrenOf(listed, root.id).map(toLeaf),
  }));
  const needs = roots("NEED").map(toLeaf);
  const audiences = roots("AUDIENCE").map(toLeaf);
  const others = roots("OTHER");
  const otherWithChildren = others.filter((r) => childrenOf(listed, r.id).length > 0);
  const otherLeaves = others.filter((r) => childrenOf(listed, r.id).length === 0).map(toLeaf);

  const menus: NavMenu[] = [
    {
      key: "suplementy",
      label: "Suplementy",
      href: "/katalog",
      wide: true,
      sections: typeSections,
    },
    {
      key: "na-co",
      label: "Na co?",
      href: "/kategorie",
      wide: true,
      sections: [
        { links: needs },
        ...(audiences.length ? [{ title: "Dla kogo", links: audiences }] : []),
      ],
    },
    ...otherWithChildren.map((root, i) => ({
      key: root.slug,
      label: root.namePl,
      href: `/kategoria/${root.slug}`,
      wide: false,
      sections: [
        { links: childrenOf(listed, root.id).map(toLeaf) },
        ...(i === otherWithChildren.length - 1 && otherLeaves.length
          ? [{ title: "Więcej", links: otherLeaves }]
          : []),
      ],
    })),
  ];
  return menus.filter((m) => m.sections.some((s) => s.links.length > 0 || s.href));
}

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getCategories,
  getCategoryDescendantIds,
  PRODUCT_LIST_SELECT,
  type ProductListItem,
} from "../actions";

// Same shape as listings, so ProductCard gets everything it needs
const productSelect = PRODUCT_LIST_SELECT;

// One row on desktop, 2×2 on phones — more pushed everything else below the fold
const FEATURED_LIMIT = 4;

// Slots the owner hasn't hand-picked (isFeatured) get one in-stock product per
// popular ingredient category, in this order — so "Polecane" is never empty.
const AUTO_FEATURED_CATEGORY_SLUGS = [
  "witamina-d",
  "magnez",
  "omega-3",
  "probiotyki",
  "kolagen",
  "witaminy-b",
  "witamina-c",
  "cynk",
  "adaptogeny",
  "witamina-k2",
];

// Seasonal tabbed shelf — edit with the season (autumn/winter now)
export const SEASONAL_SHELF = {
  title: "Na jesień i zimę",
  tabs: [
    { label: "Odporność", slug: "na-odpornosc" },
    { label: "Witamina D", slug: "witamina-d" },
    { label: "Sen", slug: "na-sen" },
  ],
};
const SEASONAL_TAB_SIZE = 4;

// "Popularne składniki" tiles, pictured by their first in-stock product
const INGREDIENT_TILE_SLUGS = [
  "magnez",
  "witamina-d",
  "omega-3",
  "probiotyki",
  "kolagen",
  "witaminy-b",
  "witamina-c",
  "cynk",
];

const sellable = {
  status: "ACTIVE",
  images: { some: {} },
  variants: { some: { isActive: true, stock: { gt: 0 } } },
} as const;

// Candidates scanned per category when spreading picks across brands
const CANDIDATE_POOL = 40;

async function sellableInCategory(slug: string, excludeIds: string[] = []) {
  const categoryIds = await getCategoryDescendantIds([slug]);
  if (categoryIds.length === 0) return [];
  return prisma.product.findMany({
    where: {
      ...sellable,
      id: { notIn: excludeIds },
      categoryLinks: { some: { categoryId: { in: categoryIds } } },
    },
    orderBy: { createdAt: "asc" },
    take: CANDIDATE_POOL,
    select: productSelect,
  });
}

// Product lines (BICAPS…) show as their parent brand (Formeds) on cards
const displayBrandSlug = (p: ProductListItem) => p.brand?.parentBrand?.slug ?? p.brand?.slug ?? "";

/** Up to `count` products, preferring brands not shown yet — the oldest products
 * are all from the first imported brand, so plain createdAt order shows one brand. */
function pickAcrossBrands(
  candidates: ProductListItem[],
  count: number,
  usedBrands = new Set<string>(),
) {
  const picked: ProductListItem[] = [];
  for (const pass of [true, false]) {
    for (const p of candidates) {
      if (picked.length >= count) return picked;
      if (picked.includes(p)) continue;
      const brand = displayBrandSlug(p);
      if (pass && usedBrands.has(brand)) continue;
      picked.push(p);
      usedBrands.add(brand);
    }
  }
  return picked;
}

async function getAutoFeatured(manual: ProductListItem[], count: number) {
  const picked: ProductListItem[] = [];
  const usedBrands = new Set(manual.map(displayBrandSlug));
  for (const slug of AUTO_FEATURED_CATEGORY_SLUGS) {
    if (picked.length >= count) break;
    const candidates = await sellableInCategory(
      slug,
      [...manual, ...picked].map((p) => p.id),
    );
    picked.push(...pickAcrossBrands(candidates, 1, usedBrands));
  }
  return picked;
}

export const getHomepageData = unstable_cache(
  async () => {
    const [categories, manualFeatured, newArrivals, promos, seasonal, ingredientProducts] =
      await Promise.all([
        getCategories(),
        prisma.product.findMany({
          where: { status: "ACTIVE", isFeatured: true },
          take: FEATURED_LIMIT,
          orderBy: { updatedAt: "desc" },
          select: productSelect,
        }),
        prisma.product.findMany({
          where: { status: "ACTIVE", isNewArrival: true },
          take: 8,
          orderBy: { createdAt: "desc" },
          select: productSelect,
        }),
        prisma.product.findMany({
          // comparePricePln is only set when a variant is discounted
          where: {
            status: "ACTIVE",
            variants: { some: { isActive: true, comparePricePln: { not: null } } },
          },
          take: 8,
          orderBy: { updatedAt: "desc" },
          select: productSelect,
        }),
        Promise.all(SEASONAL_SHELF.tabs.map((tab) => sellableInCategory(tab.slug))),
        Promise.all(INGREDIENT_TILE_SLUGS.map((slug) => sellableInCategory(slug))),
      ]);

    const featured =
      manualFeatured.length >= FEATURED_LIMIT
        ? manualFeatured
        : [
            ...manualFeatured,
            ...(await getAutoFeatured(manualFeatured, FEATURED_LIMIT - manualFeatured.length)),
          ];

    const seasonalTabs = SEASONAL_SHELF.tabs.map((tab, i) => ({
      ...tab,
      category: categories.find((c) => c.slug === tab.slug) ?? null,
      products: pickAcrossBrands(seasonal[i], SEASONAL_TAB_SIZE),
    }));

    const ingredientTiles = INGREDIENT_TILE_SLUGS.flatMap((slug, i) => {
      const category = categories.find((c) => c.slug === slug);
      const image = ingredientProducts[i][0]?.images[0];
      return category && image ? [{ category, image }] : [];
    });

    return {
      categories,
      featured,
      // "Zobacz wszystkie" filters by isFeatured — pointless while the row is auto-filled
      featuredHref: manualFeatured.length > 0 ? "/katalog?polecane=1" : "/katalog",
      newArrivals,
      promos,
      seasonalTabs,
      ingredientTiles,
    };
  },
  ["homepage-v5"],
  { tags: ["categories", "products"] },
);

import { unstable_cache } from "next/cache";
import { discountPercent } from "@/lib/omnibus";
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

// Seasonal pick — edit with the season (autumn/winter now). Products are
// taken round-robin from these categories; the first one is the "see all" link.
export const SEASONAL_SHELF = {
  title: "Na jesień i zimę",
  tabs: [
    { label: "Odporność", slug: "na-odpornosc" },
    { label: "Witamina D", slug: "witamina-d" },
    { label: "Sen", slug: "na-sen" },
  ],
};
const SEASONAL_SIZE = 4;

// Promo band: one lead tile + four small items
const PROMOS_LIMIT = 5;
// Nowości: dense list, two/three columns
const NEW_LIMIT = 6;
// Over-fetch so rows already shown higher up can be dropped without a second query
const ROW_POOL = 16;

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

/** Round-robin across the seasonal categories, spreading brands. */
function pickSeasonal(pools: ProductListItem[][], count: number, excludeIds: Set<string>) {
  const usedBrands = new Set<string>();
  const queues = pools.map((pool) =>
    pickAcrossBrands(
      pool.filter((p) => !excludeIds.has(p.id)),
      count,
    ),
  );
  const picked: ProductListItem[] = [];
  for (let round = 0; picked.length < count && queues.some((q) => q.length > round); round++) {
    for (const queue of queues) {
      const p = queue[round];
      if (!p || picked.length >= count || picked.some((x) => x.id === p.id)) continue;
      // Second-choice brand repeats are fine once every pool is drained of new brands
      if (usedBrands.has(displayBrandSlug(p)) && queue.length > round + 1) continue;
      picked.push(p);
      usedBrands.add(displayBrandSlug(p));
    }
  }
  return picked;
}

const offerDiscount = (p: ProductListItem) => {
  const v = p.variants[0];
  return v ? (discountPercent(v) ?? 0) : 0;
};

export const getHomepageData = unstable_cache(
  async () => {
    const [categories, manualFeatured, newPool, promoPool, seasonal, ingredientProducts] =
      await Promise.all([
        getCategories(),
        prisma.product.findMany({
          where: { status: "ACTIVE", isFeatured: true },
          take: FEATURED_LIMIT,
          orderBy: { updatedAt: "desc" },
          select: productSelect,
        }),
        prisma.product.findMany({
          where: { ...sellable, isNewArrival: true },
          take: ROW_POOL,
          orderBy: { createdAt: "desc" },
          select: productSelect,
        }),
        prisma.product.findMany({
          // comparePricePln is only set when a variant is discounted
          where: {
            ...sellable,
            variants: {
              some: { isActive: true, stock: { gt: 0 }, comparePricePln: { not: null } },
            },
          },
          take: ROW_POOL,
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

    // Each product appears once on the page, in the first section that wants it
    const shown = new Set(featured.map((p) => p.id));
    const seasonalProducts = pickSeasonal(seasonal, SEASONAL_SIZE, shown);
    for (const p of seasonalProducts) shown.add(p.id);

    // Real reductions only (Omnibus), biggest first: the lead tile is the best deal
    const promos = promoPool
      .filter((p) => !shown.has(p.id) && offerDiscount(p) > 0)
      .sort((a, b) => offerDiscount(b) - offerDiscount(a))
      .slice(0, PROMOS_LIMIT);
    for (const p of promos) shown.add(p.id);

    const newArrivals = newPool.filter((p) => !shown.has(p.id)).slice(0, NEW_LIMIT);

    const seasonalCategories = SEASONAL_SHELF.tabs.flatMap((tab) => {
      const category = categories.find((c) => c.slug === tab.slug);
      return category && category.productCount > 0 ? [{ ...tab, category }] : [];
    });

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
      seasonal: { categories: seasonalCategories, products: seasonalProducts },
      ingredientTiles,
    };
  },
  ["homepage-v6"],
  { tags: ["categories", "products"] },
);

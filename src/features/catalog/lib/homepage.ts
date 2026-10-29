import { unstable_cache } from "next/cache";
import { POSTS_TAG } from "@/features/blog/lib/queries";
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

// Bestseller tabs: Polecane plus the biggest "na …" needs
const NEED_TABS = 3;
// Per-tab query size; four are shown, the rest lets brands spread
const TAB_POOL = 8;

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

/** Four products for one need tab: one capped query, brands spread, nothing
 * already in an earlier row. */
async function needTabProducts(slug: string, excludeIds: string[]) {
  const categoryIds = await getCategoryDescendantIds([slug]);
  if (categoryIds.length === 0) return [];
  const pool = await prisma.product.findMany({
    where: {
      ...sellable,
      id: { notIn: excludeIds },
      categoryLinks: { some: { categoryId: { in: categoryIds } } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: TAB_POOL,
    select: productSelect,
  });
  return pickAcrossBrands(pool, FEATURED_LIMIT);
}

const offerDiscount = (p: ProductListItem) => {
  const v = p.variants[0];
  return v ? (discountPercent(v) ?? 0) : 0;
};

export const getHomepageData = unstable_cache(
  async () => {
    const [categories, manualFeatured, newPool, promoPool, ingredientProducts] = await Promise.all([
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
      Promise.all(INGREDIENT_TILE_SLUGS.map((slug) => sellableInCategory(slug))),
    ]);

    const featured =
      manualFeatured.length >= FEATURED_LIMIT
        ? manualFeatured
        : [
            ...manualFeatured,
            ...(await getAutoFeatured(manualFeatured, FEATURED_LIMIT - manualFeatured.length)),
          ];

    // Need tabs: the biggest top-level "na …" categories (ties: menu order)
    const needs = categories
      .filter((c) => c.parentId === null && c.group === "NEED" && c.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount || a.sortOrder - b.sortOrder)
      .slice(0, NEED_TABS);
    const featuredIds = featured.map((p) => p.id);
    const needProducts = await Promise.all(needs.map((c) => needTabProducts(c.slug, featuredIds)));
    const tabs = [
      {
        id: "polecane",
        label: "Polecane",
        // "Zobacz wszystkie" filters by isFeatured — pointless while the row is auto-filled
        href: manualFeatured.length > 0 ? "/katalog?polecane=1" : "/katalog",
        products: featured,
      },
      ...needs.map((c, i) => ({
        id: c.slug,
        label: c.namePl,
        href: `/kategoria/${c.slug}`,
        products: needProducts[i],
      })),
    ].filter((tab) => tab.products.length > 0);

    // Each product appears once on the page, in the first section that wants it
    const shown = new Set(tabs.flatMap((tab) => tab.products.map((p) => p.id)));

    // Real reductions only (Omnibus), biggest first: the lead tile is the best deal
    const promos = promoPool
      .filter((p) => !shown.has(p.id) && offerDiscount(p) > 0)
      .sort((a, b) => offerDiscount(b) - offerDiscount(a))
      .slice(0, PROMOS_LIMIT);
    for (const p of promos) shown.add(p.id);

    const newArrivals = newPool.filter((p) => !shown.has(p.id)).slice(0, NEW_LIMIT);

    const ingredientTiles = INGREDIENT_TILE_SLUGS.flatMap((slug, i) => {
      const category = categories.find((c) => c.slug === slug);
      const image = ingredientProducts[i][0]?.images[0];
      return category && image ? [{ category, image }] : [];
    });

    return {
      categories,
      tabs,
      newArrivals,
      promos,
      ingredientTiles,
    };
  },
  ["homepage-v7"],
  { tags: ["categories", "products"] },
);

const GUIDES_LIMIT = 3;
const WORDS_PER_MINUTE = 200;

/** Latest Poradnik posts with reading time; the body is only counted, never returned. */
export const getHomeGuides = unstable_cache(
  async () => {
    const posts = await prisma.post.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: GUIDES_LIMIT,
      select: { slug: true, titlePl: true, categorySlug: true, contentPl: true },
    });
    return posts.map(({ contentPl, ...post }) => ({
      ...post,
      readingMinutes: readingMinutes(contentPl),
    }));
  },
  ["home-guides"],
  { tags: [POSTS_TAG] },
);

/** Same count as the post editor: tags stripped, ~200 words a minute. */
export function readingMinutes(html: string) {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

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
import { STOCK_LISTINGS_TAG } from "./product-tag";

// Same shape as listings, so ProductCard gets everything it needs
const productSelect = PRODUCT_LIST_SELECT;

// Two rows on desktop, three rows of two on phones (BestsellerTabs hides the rest)
const FEATURED_LIMIT = 8;

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
// Per-tab query size; eight are shown, the rest lets brands spread
const TAB_POOL = 24;

// Food shelf: the range most visitors don't expect from a supplement shop.
// Round-robin over these categories so one shelf shows chocolate, snacks,
// coffee and sweeteners instead of 8 bars.
const FOOD_TAB_SLUG = "zywnosc";
const FOOD_SHELF_SLUGS = [
  "czekolady-i-czekoladki",
  "chipsy-i-przekaski-slone",
  "kawa-i-herbata",
  "batony",
  "przekaski-owocowe",
  "ciastka-i-wafle",
  "slodziki",
  "przyprawy-i-sol",
  "slodycze",
];
const FOOD_SHELF_LIMIT = 8;

// "Promocje" tab first once a row of real reductions exists
export const PROMO_TAB_ID = "promocje";
const PROMO_TAB_MIN = 4;
// Promo band: one lead tile + four small items
const PROMOS_LIMIT = 5;
// Campaign section (Black Week…): two rows of four, biggest reductions first
const CAMPAIGN_LIMIT = 8;
// Every discounted product, so the biggest reductions can be picked
const PROMO_POOL = 120;
// Nowości: dense list, two/three columns
const NEW_LIMIT = 9;
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

/** Eight products for one need tab: one capped query, brands spread, nothing
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
        take: PROMO_POOL,
        orderBy: { updatedAt: "desc" },
        select: productSelect,
      }),
      Promise.all(INGREDIENT_TILE_SLUGS.map((slug) => sellableInCategory(slug))),
    ]);
    const productCount = await prisma.product.count({ where: sellable });

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
    const food = categories.find((c) => c.slug === FOOD_TAB_SLUG && c.productCount > 0);
    const [needProducts, foodTabProducts] = await Promise.all([
      Promise.all(needs.map((c) => needTabProducts(c.slug, featuredIds))),
      food ? needTabProducts(food.slug, featuredIds) : Promise.resolve([]),
    ]);
    // Real reductions only (Omnibus), biggest first: the lead tile is the best deal
    const reductions = promoPool
      .filter((p) => offerDiscount(p) > 0)
      .sort((a, b) => offerDiscount(b) - offerDiscount(a));
    // Promocje opens the page when there are enough real reductions to fill a row
    const promoTab = reductions.length >= PROMO_TAB_MIN ? reductions.slice(0, FEATURED_LIMIT) : [];
    const tabs = [
      ...(promoTab.length > 0
        ? [{ id: PROMO_TAB_ID, label: "Promocje", href: "/katalog?promocje=1", products: promoTab }]
        : []),
      {
        id: "polecane",
        label: "Polecane",
        // "Zobacz wszystkie" filters by isFeatured — pointless while the row is auto-filled
        href: manualFeatured.length > 0 ? "/katalog?polecane=1" : "/katalog",
        products: featured,
      },
      // Second, so the first screen says "not only supplements"
      ...(food
        ? [
            {
              id: food.slug,
              label: food.namePl,
              href: `/kategoria/${food.slug}`,
              products: foodTabProducts,
            },
          ]
        : []),
      ...needs.map((c, i) => ({
        id: c.slug,
        label: c.namePl,
        href: `/kategoria/${c.slug}`,
        products: needProducts[i],
      })),
    ].filter((tab) => tab.products.length > 0);

    // Each product appears once on the page, in the first section that wants it
    const shown = new Set(tabs.flatMap((tab) => tab.products.map((p) => p.id)));

    // A campaign shows the best ones even if a tab above has them too: the
    // page decides at render time whether a campaign is on
    const campaignProducts = reductions.slice(0, CAMPAIGN_LIMIT);
    const promos = reductions.filter((p) => !shown.has(p.id)).slice(0, PROMOS_LIMIT);
    for (const p of promos) shown.add(p.id);

    // Food shelf: one product per food category in turn, nothing shown above
    const foodBrands = new Set<string>();
    const foodPools = await Promise.all(
      FOOD_SHELF_SLUGS.map(async (slug) => {
        const pool = await sellableInCategory(slug, [...shown]);
        // Brands spread inside each category, the shelf's brands spread across them
        return pickAcrossBrands(pool, pool.length, foodBrands);
      }),
    );
    const foodShelf: ProductListItem[] = [];
    for (let round = 0; foodShelf.length < FOOD_SHELF_LIMIT && round < CANDIDATE_POOL; round++) {
      let added = false;
      for (const pool of foodPools) {
        const p = pool.filter((x) => !shown.has(x.id) && !foodShelf.includes(x))[0];
        if (!p || foodShelf.length >= FOOD_SHELF_LIMIT) continue;
        foodShelf.push(p);
        shown.add(p.id);
        added = true;
      }
      if (!added) break;
    }
    const foodCategories = categories.filter(
      (c) =>
        c.productCount > 0 &&
        (c.slug === "czekolady-i-czekoladki" || (food != null && c.parentId === food.id)),
    );

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
      campaignProducts,
      ingredientTiles,
      foodShelf,
      foodCategories,
      productCount,
    };
  },
  ["homepage-v10"],
  { tags: ["categories", "products", STOCK_LISTINGS_TAG] },
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

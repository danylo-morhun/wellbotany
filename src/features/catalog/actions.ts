import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { MAIN_IMAGE_FIRST } from "@/features/catalog/lib/main-image";
import { prisma } from "@/lib/prisma";
import { computeBrandSubtreeCounts, getBrandSubtreeIds } from "./lib/brand-tree";
import {
  buildFacetWhere,
  buildProductOrderBy,
  buildProductWhere,
  type CatalogFilters,
  parseCatalogFilters,
  withStockAvailability,
} from "./lib/filters";
import { computeSubtreeCounts } from "./lib/nav";
import { ingredientTokens, type RelatedSeed, rankRelated } from "./lib/related";
import { rankBySearchRelevance } from "./lib/search-relevance";

export const PRODUCT_LIST_SELECT = {
  id: true,
  slug: true,
  namePl: true,
  shortDescPl: true,
  isNewArrival: true,
  isFeatured: true,
  netWeight: true,
  brand: {
    select: { name: true, slug: true, parentBrand: { select: { name: true, slug: true } } },
  },
  category: { select: { namePl: true, slug: true } },
  images: {
    select: { url: true, altPl: true },
    orderBy: MAIN_IMAGE_FIRST,
    take: 1,
  },
  variants: {
    where: { isActive: true },
    select: {
      id: true,
      pricePln: true,
      comparePricePln: true,
      lowestPrice30dPln: true,
      stock: true,
      isDefault: true,
      optionValue: true,
    },
    orderBy: { isDefault: "desc" },
    take: 1,
  },
  // Unit price falls back to product-level quantity only for single-variant products
  _count: { select: { variants: { where: { isActive: true } } } },
  tags: {
    select: {
      tag: { select: { namePl: true, slug: true, iconUrl: true, type: true } },
    },
  },
} as const;

// Bound on how many candidates get pulled in for relevance ranking when a
// search is combined with another structural filter — generous for this
// catalog's size while keeping worst-case query cost fixed. A search with no
// other filter uses `getSearchableProducts` instead (the full active
// catalog, cached) so recall never depends on this cap.
const RELEVANCE_CANDIDATE_CAP = 500;

// Only what fuzzy-ranking + the in-stock/out-of-stock split need — the
// candidate set is the full active catalog (or up to RELEVANCE_CANDIDATE_CAP
// rows), so keeping this lean matters; images/pricing are fetched afterward,
// only for the handful of rows that actually end up on the page.
const PRODUCT_SEARCH_SELECT = {
  id: true,
  slug: true,
  namePl: true,
  shortDescPl: true,
  brand: { select: { name: true, parentBrand: { select: { name: true } } } },
  category: { select: { namePl: true } },
  tags: { select: { tag: { select: { namePl: true } } } },
  variants: { where: { isActive: true }, select: { stock: true, pricePln: true } },
} as const;

/** Every active product, search-relevant fields only — cached for fast, DB-free fuzzy search on every keystroke. */
export const getSearchableProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: PRODUCT_SEARCH_SELECT,
    }),
  ["searchable-products"],
  { tags: ["products"] },
);

/** Resolves ranked candidate ids to full display data, in the same order. */
export async function fetchProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: PRODUCT_LIST_SELECT,
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => row != null);
}

function hasStructuralFilter(filters: CatalogFilters): boolean {
  return Boolean(
    filters.category?.length ||
      filters.brand?.length ||
      filters.tags?.length ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.onlyPromo ||
      filters.onlyNew ||
      filters.onlyFeatured ||
      filters.inStockOnly,
  );
}

export async function getProducts(filters: CatalogFilters) {
  const categoryIds = filters.category?.length
    ? await getCategoryDescendantIds(filters.category)
    : undefined;
  const brandIds = filters.brand?.length ? await getBrandDescendantIds(filters.brand) : undefined;
  let where = buildProductWhere(filters, categoryIds, brandIds);
  if (filters.inStockOnly) {
    where = withStockAvailability(where, true);
  }
  const orderBy = buildProductOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.perPage;

  // A search term always narrows to fuzzy-matched candidates first, no
  // matter which sort is active — only the order *within* that matched set
  // changes: relevance for the default sort, otherwise whatever the picked
  // sort criterion is. (Previously an explicit sort bypassed the search
  // narrowing entirely, so e.g. "test" + "Cena rosnąco" showed the whole
  // unfiltered catalog sorted by price instead of just the matches.)
  if (filters.search) {
    const candidates = hasStructuralFilter(filters)
      ? await prisma.product.findMany({
          where,
          orderBy,
          take: RELEVANCE_CANDIDATE_CAP,
          select: PRODUCT_SEARCH_SELECT,
        })
      : await getSearchableProducts();
    let ranked = rankBySearchRelevance(candidates, filters.search);
    if (filters.sort === "name_asc") {
      ranked = [...ranked].sort((a, b) => a.namePl.localeCompare(b.namePl, "pl"));
    } else if (filters.sort === "name_desc") {
      ranked = [...ranked].sort((a, b) => b.namePl.localeCompare(a.namePl, "pl"));
    } else if (filters.sort === "price_asc" || filters.sort === "price_desc") {
      const dir = filters.sort === "price_asc" ? 1 : -1;
      const minPrice = (p: (typeof ranked)[number]) =>
        p.variants.length > 0
          ? Math.min(...p.variants.map((v) => v.pricePln))
          : Number.POSITIVE_INFINITY;
      ranked = [...ranked].sort((a, b) => dir * (minPrice(a) - minPrice(b)));
    }
    const inStockRanked = ranked.filter((p) => p.variants.some((v) => v.stock > 0));
    const outOfStockRanked = ranked.filter((p) => !p.variants.some((v) => v.stock > 0));
    const orderedIds = [...inStockRanked, ...outOfStockRanked].map((p) => p.id);
    const pageIds = orderedIds.slice(skip, skip + filters.perPage);
    const items = await fetchProductsByIds(pageIds);
    return { items, total: orderedIds.length };
  }

  // Prisma's relation-aggregate `orderBy` only supports `_count`, not `_min`/
  // `_max` on a to-many relation — so price sort is ranked in JS (by each
  // product's cheapest active variant) the same way search relevance is,
  // rather than via a DB `orderBy`.
  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    const candidates = await prisma.product.findMany({
      where,
      select: {
        id: true,
        variants: { where: { isActive: true }, select: { pricePln: true, stock: true } },
      },
    });
    const dir = filters.sort === "price_asc" ? 1 : -1;
    const ranked = candidates
      .map((p) => ({
        id: p.id,
        inStock: p.variants.some((v) => v.stock > 0),
        minPrice: p.variants.length > 0 ? Math.min(...p.variants.map((v) => v.pricePln)) : null,
      }))
      .sort((a, b) => {
        const pa = a.minPrice ?? Number.POSITIVE_INFINITY;
        const pb = b.minPrice ?? Number.POSITIVE_INFINITY;
        return dir * (pa - pb);
      });
    const inStockRanked = ranked.filter((p) => p.inStock);
    const outOfStockRanked = ranked.filter((p) => !p.inStock);
    const orderedIds = [...inStockRanked, ...outOfStockRanked].map((p) => p.id);
    const pageIds = orderedIds.slice(skip, skip + filters.perPage);
    const items = await fetchProductsByIds(pageIds);
    return { items, total: orderedIds.length };
  }

  // Prisma can only order a to-many relation by `_count`, not by a threshold
  // on one of its fields — so "in stock first" is done by querying the two
  // groups separately (in a stable order) and concatenating them, rather
  // than via a single orderBy.
  const inStockWhere = withStockAvailability(where, true);
  const outOfStockWhere = withStockAvailability(where, false);

  const [inStockCount, total] = await Promise.all([
    prisma.product.count({ where: inStockWhere }),
    prisma.product.count({ where }),
  ]);

  let items: Awaited<
    ReturnType<typeof prisma.product.findMany<{ select: typeof PRODUCT_LIST_SELECT }>>
  >;
  if (skip < inStockCount) {
    const take = Math.min(filters.perPage, inStockCount - skip);
    const inStockItems = await prisma.product.findMany({
      where: inStockWhere,
      orderBy,
      skip,
      take,
      select: PRODUCT_LIST_SELECT,
    });
    const remaining = filters.perPage - inStockItems.length;
    const outOfStockItems =
      remaining > 0
        ? await prisma.product.findMany({
            where: outOfStockWhere,
            orderBy,
            skip: 0,
            take: remaining,
            select: PRODUCT_LIST_SELECT,
          })
        : [];
    items = [...inStockItems, ...outOfStockItems];
  } else {
    items = await prisma.product.findMany({
      where: outOfStockWhere,
      orderBy,
      skip: skip - inStockCount,
      take: filters.perPage,
      select: PRODUCT_LIST_SELECT,
    });
  }

  return { items, total };
}

export type ProductListItem = Awaited<ReturnType<typeof getProducts>>["items"][number];

export const getProduct = unstable_cache(
  async (slug: string) =>
    prisma.product.findFirst({
      where: { slug, status: "ACTIVE" },
      select: {
        id: true,
        slug: true,
        namePl: true,
        nameEn: true,
        shortDescPl: true,
        descriptionPl: true,
        benefitsPl: true,
        isNewArrival: true,
        isFeatured: true,
        netWeight: true,
        servingSize: true,
        servingsPerContainer: true,
        storageInfo: true,
        countryOfOrigin: true,
        usageInstructionsPl: true,
        ingredients: true,
        nutritionFacts: true,
        allergenInfo: true,
        healthWarnings: true,
        contraindicationsPl: true,
        ageRestriction: true,
        certifications: true,
        responsibleEntity: true,
        metaTitlePl: true,
        metaDescPl: true,
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
            parentBrandId: true,
            parentBrand: { select: { name: true, slug: true } },
          },
        },
        category: {
          select: {
            id: true,
            namePl: true,
            slug: true,
            parentId: true,
            parent: { select: { namePl: true, slug: true } },
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            altPl: true,
            sortOrder: true,
            isMain: true,
            variantId: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            ean: true,
            optionLabel: true,
            optionValue: true,
            pricePln: true,
            comparePricePln: true,
            lowestPrice30dPln: true,
            stock: true,
            trackStock: true,
            isDefault: true,
            weightGrams: true,
          },
          orderBy: { isDefault: "desc" },
        },
        tags: {
          select: {
            tag: {
              select: { id: true, namePl: true, slug: true, iconUrl: true, type: true },
            },
          },
        },
      },
    }),
  ["product-by-slug-v2"],
  { tags: ["products"] },
);

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

/** Every category with `productCount` = distinct active products in its whole subtree. */
export const getCategories = unstable_cache(
  async () => {
    const [categories, links] = await Promise.all([
      prisma.category.findMany({
        select: {
          id: true,
          slug: true,
          namePl: true,
          headingPl: true,
          group: true,
          image: true,
          icon: true,
          sortOrder: true,
          parentId: true,
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.productCategory.findMany({
        where: { product: { status: "ACTIVE" } },
        select: { productId: true, categoryId: true },
      }),
    ]);
    const counts = computeSubtreeCounts(categories, links);
    return categories.map((c) => ({ ...c, productCount: counts.get(c.id) ?? 0 }));
  },
  ["categories-v2"],
  { tags: ["categories", "products"] },
);

export type CategoryItem = Awaited<ReturnType<typeof getCategories>>[number];

function buildCategoryChildrenMap(categories: CategoryItem[]): Map<string, CategoryItem[]> {
  const byParent = new Map<string, CategoryItem[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const siblings = byParent.get(c.parentId) ?? [];
    siblings.push(c);
    byParent.set(c.parentId, siblings);
  }
  return byParent;
}

function collectSubtreeIds(rootId: string, byParent: Map<string, CategoryItem[]>): string[] {
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

/** A category page must include products from its whole subtree, not just direct hits — parent nodes like "Waga i metabolizm" hold no products of their own. Accepts multiple slugs and returns the union of their subtrees, deduped. */
export async function getCategoryDescendantIds(slugs: string[]): Promise<string[]> {
  const categories = await getCategories();
  const roots = slugs.flatMap((slug) => {
    const match = categories.find((c) => c.slug === slug);
    return match ? [match.id] : [];
  });
  if (roots.length === 0) return [];

  const byParent = buildCategoryChildrenMap(categories);
  const ids = new Set<string>();
  for (const root of roots) {
    for (const id of collectSubtreeIds(root, byParent)) ids.add(id);
  }
  return [...ids];
}

// Raw, flat brand table — a manufacturer's product line (e.g. ForMeds'
// BICAPS) is its own Brand row with `parentBrandId` set, so this includes
// both parents and children, unfiltered by product count (subtree rollup
// needs every node, even ones with zero direct products of their own).
const getBrandsFlat = unstable_cache(
  async () =>
    prisma.brand.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        parentBrandId: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    }),
  ["brands-flat"],
  { tags: ["brands"] },
);

type BrandFlat = Awaited<ReturnType<typeof getBrandsFlat>>[number];

export type BrandItem = Omit<BrandFlat, "_count"> & {
  _count: { products: number };
  subBrands: BrandItem[];
};

/** Top-level brands only, each carrying its non-empty product lines as `subBrands` — a parent like Formeds holds no products directly, so its count is the rolled-up sum of its lines (`computeBrandSubtreeCounts`). Brands (parent or leaf) with zero products anywhere in their subtree are dropped, same as the old direct-count filter did for leaves. */
export async function getBrands(): Promise<BrandItem[]> {
  const flat = await getBrandsFlat();
  const rolledUp = computeBrandSubtreeCounts(flat);

  const byParent = new Map<string, BrandFlat[]>();
  for (const b of flat) {
    if (!b.parentBrandId) continue;
    const siblings = byParent.get(b.parentBrandId) ?? [];
    siblings.push(b);
    byParent.set(b.parentBrandId, siblings);
  }

  // `flat` is already name-sorted at the DB level, and both the top-level
  // filter below and each `byParent` bucket preserve that relative order.
  function toItem(b: BrandFlat): BrandItem {
    const subBrands = (byParent.get(b.id) ?? [])
      .filter((c) => (rolledUp.get(c.id) ?? 0) > 0)
      .map(toItem);
    return { ...b, _count: { products: rolledUp.get(b.id) ?? 0 }, subBrands };
  }

  return flat.filter((b) => !b.parentBrandId && (rolledUp.get(b.id) ?? 0) > 0).map(toItem);
}

/** A brand page (e.g. `/marki/formeds`) must include products from its whole subtree, not just direct hits — parent brands hold no products of their own. Accepts multiple slugs and returns the union of their subtrees' ids, deduped. */
export async function getBrandDescendantIds(slugs: string[]): Promise<string[]> {
  const flat = await getBrandsFlat();
  return getBrandSubtreeIds(flat, slugs);
}

/**
 * Resolves the active `CatalogFilters` from the request's `searchParams` —
 * `react`'s `cache()` dedupes this within a single request as long as the
 * same `searchParams` promise and `categoryOverride` are passed, so the
 * desktop sidebar and the mobile drawer (which both need it independently,
 * each inside its own Suspense boundary) don't each trigger their own parse
 * + facet-count queries.
 */
export const resolveCatalogFilters = cache(
  async (
    searchParams: Promise<Record<string, string | string[] | undefined>>,
    categoryOverride?: string,
    brandOverride?: string,
  ): Promise<CatalogFilters> => {
    const raw = await searchParams;
    return parseCatalogFilters({
      ...raw,
      ...(categoryOverride ? { kategoria: categoryOverride } : {}),
      ...(brandOverride ? { marka: brandOverride } : {}),
    });
  },
);

/** Product counts per category (including its subtree, matching what selecting the checkbox actually filters to) under the currently active filters (excluding the category filter itself) — filter-dependent, so `cache()`d per-request rather than `unstable_cache`d, so checkbox counts track the active combination. */
export const getCategoryFacetCounts = cache(
  async (filters: CatalogFilters): Promise<Map<string, number>> => {
    const brandIds = filters.brand?.length ? await getBrandDescendantIds(filters.brand) : undefined;
    const where = buildFacetWhere(filters, "category", undefined, brandIds);
    const [links, categories] = await Promise.all([
      prisma.productCategory.findMany({
        where: { product: where },
        select: { productId: true, categoryId: true },
      }),
      getCategories(),
    ]);
    return computeSubtreeCounts(categories, links);
  },
);

/** Product counts per brand (rolled up through `subBrands`, matching what selecting a parent's checkbox actually filters to) under the currently active filters (excluding the brand filter itself) — filter-dependent, so `cache()`d per-request rather than `unstable_cache`d, so checkbox counts track the active combination. */
export const getBrandFacetCounts = cache(
  async (filters: CatalogFilters): Promise<Map<string, number>> => {
    const categoryIds = filters.category?.length
      ? await getCategoryDescendantIds(filters.category)
      : undefined;
    const where = buildFacetWhere(filters, "brand", categoryIds);
    const [rows, brandsFlat] = await Promise.all([
      prisma.product.groupBy({
        by: ["brandId"],
        where,
        _count: { _all: true },
      }),
      getBrandsFlat(),
    ]);

    const directCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.brandId != null) directCounts.set(r.brandId, r._count._all);
    }

    // `computeBrandSubtreeCounts` reads `_count.products`, so stub it with
    // this request's filtered direct counts before rolling up the sums.
    const scopedBrands = brandsFlat.map((b) => ({
      ...b,
      _count: { products: directCounts.get(b.id) ?? 0 },
    }));
    return computeBrandSubtreeCounts(scopedBrands);
  },
);

/** Rewrites `_count.products` (top-level and every `subBrands` entry) to the filter-scoped facet counts — `getBrands()`'s own counts are unscoped ("all time"), so the sidebar needs this applied on top before rendering checkboxes. */
export function applyBrandFacetCounts(
  brands: BrandItem[],
  counts: Map<string, number>,
): BrandItem[] {
  function apply(b: BrandItem): BrandItem {
    return {
      ...b,
      _count: { products: counts.get(b.id) ?? 0 },
      subBrands: b.subBrands.map(apply),
    };
  }
  return brands.map(apply);
}

export const getTags = unstable_cache(
  async () =>
    prisma.tag.findMany({
      select: { id: true, slug: true, namePl: true, iconUrl: true, type: true },
      orderBy: { sortOrder: "asc" },
    }),
  ["tags"],
  { tags: ["tags"] },
);

export type TagItem = Awaited<ReturnType<typeof getTags>>[number];

export const getCategoryBySlug = unstable_cache(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        namePl: true,
        headingPl: true,
        descriptionPl: true,
        metaTitlePl: true,
        metaDescPl: true,
        contentPl: true,
        faqPl: true,
        image: true,
        parentId: true,
        parent: { select: { namePl: true, slug: true } },
        children: { select: { namePl: true, slug: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
  ["category-by-slug-v3"],
  { tags: ["categories"] },
);

/** Target of a moved storefront path (merged product, renamed category), if any. */
export const getRedirectTarget = unstable_cache(
  async (fromPath: string) =>
    (await prisma.redirect.findUnique({ where: { fromPath }, select: { toPath: true } }))?.toPath ??
    null,
  ["redirect-target"],
  { tags: ["redirects"] },
);

export const getBrandBySlug = unstable_cache(
  async (slug: string) =>
    prisma.brand.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        contentPl: true,
        logo: true,
        website: true,
        countryCode: true,
      },
    }),
  ["brand-by-slug"],
  { tags: ["brands"] },
);

const RELATED_CANDIDATE_TAKE = 300;
const RELATED_NAME_TOKENS = 3;

/**
 * "Podobne produkty" for the PDP. Pulls a lean candidate pool (same
 * category, sibling categories, same brand family, or sharing an ingredient
 * word in the name) and ranks it with `rankRelated`. Falls back to featured,
 * then newest, so the section is never empty.
 */
export const getRelatedProducts = unstable_cache(
  async (seed: RelatedSeed, take = 4) => getRelatedProductsUncached(seed, take),
  ["related-products-v2"],
  { tags: ["products"] },
);

async function getRelatedProductsUncached(seed: RelatedSeed, take = 4) {
  const brandFamilyId = seed.brandParentId ?? seed.brandId;
  const orConditions: Prisma.ProductWhereInput[] = [
    ...(seed.categoryId ? [{ categoryId: seed.categoryId }] : []),
    ...(seed.categoryParentId ? [{ category: { parentId: seed.categoryParentId } }] : []),
    ...(brandFamilyId
      ? [{ brand: { OR: [{ id: brandFamilyId }, { parentBrandId: brandFamilyId }] } }]
      : []),
    ...[...ingredientTokens(seed)]
      .slice(0, RELATED_NAME_TOKENS)
      .map((t) => ({ namePl: { contains: t, mode: "insensitive" as const } })),
  ];

  const rows = orConditions.length
    ? await prisma.product.findMany({
        where: { status: "ACTIVE", id: { not: seed.id }, OR: orConditions },
        take: RELATED_CANDIDATE_TAKE,
        select: {
          id: true,
          namePl: true,
          categoryId: true,
          category: { select: { parentId: true } },
          brandId: true,
          brand: { select: { name: true, parentBrandId: true } },
          _count: { select: { images: true } },
          variants: { where: { isActive: true }, select: { stock: true, trackStock: true } },
        },
      })
    : [];

  const rankedIds = rankRelated(
    seed,
    rows.map((r) => ({
      id: r.id,
      namePl: r.namePl,
      categoryId: r.categoryId,
      categoryParentId: r.category?.parentId ?? null,
      brandId: r.brandId,
      brandParentId: r.brand?.parentBrandId ?? null,
      brandName: r.brand?.name ?? null,
      hasImage: r._count.images > 0,
      inStock: r.variants.some((v) => !v.trackStock || v.stock > 0),
    })),
    take,
  );

  if (rankedIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: rankedIds } },
      select: PRODUCT_LIST_SELECT,
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return rankedIds.flatMap((id) => byId.get(id) ?? []);
  }

  const featured = await prisma.product.findMany({
    where: { status: "ACTIVE", id: { not: seed.id }, isFeatured: true },
    take,
    orderBy: { updatedAt: "desc" },
    select: PRODUCT_LIST_SELECT,
  });
  if (featured.length > 0) return featured;

  return prisma.product.findMany({
    where: { status: "ACTIVE", id: { not: seed.id } },
    take,
    orderBy: { createdAt: "desc" },
    select: PRODUCT_LIST_SELECT,
  });
}

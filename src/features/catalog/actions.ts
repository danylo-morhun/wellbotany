import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  buildFacetWhere,
  buildProductOrderBy,
  buildProductWhere,
  type CatalogFilters,
  parseCatalogFilters,
  withStockAvailability,
} from "./lib/filters";
import { computeSubtreeCounts } from "./lib/nav";
import { rankBySearchRelevance } from "./lib/search-relevance";

const PRODUCT_LIST_SELECT = {
  id: true,
  slug: true,
  namePl: true,
  shortDescPl: true,
  isNewArrival: true,
  isFeatured: true,
  brand: { select: { name: true, slug: true } },
  category: { select: { namePl: true, slug: true } },
  images: {
    where: { isMain: true },
    select: { url: true, altPl: true },
    orderBy: { sortOrder: "asc" },
    take: 1,
  },
  variants: {
    where: { isActive: true },
    select: { id: true, pricePln: true, comparePricePln: true, stock: true, isDefault: true },
    orderBy: { isDefault: "desc" },
    take: 1,
  },
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
  brand: { select: { name: true } },
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
  let where = buildProductWhere(filters, categoryIds);
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
          select: { id: true, name: true, slug: true, description: true, logo: true },
        },
        category: {
          select: {
            id: true,
            namePl: true,
            slug: true,
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
            optionLabel: true,
            optionValue: true,
            pricePln: true,
            comparePricePln: true,
            stock: true,
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
  ["product-by-slug"],
  { tags: ["products"] },
);

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

export const getCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        namePl: true,
        image: true,
        icon: true,
        sortOrder: true,
        parentId: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ["categories"],
  { tags: ["categories"] },
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

export const getBrands = unstable_cache(
  async () =>
    prisma.brand.findMany({
      where: { products: { some: { status: "ACTIVE" } } },
      select: {
        id: true,
        slug: true,
        name: true,
        logo: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { name: "asc" },
    }),
  ["brands"],
  { tags: ["brands"] },
);

export type BrandItem = Awaited<ReturnType<typeof getBrands>>[number];

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
  ): Promise<CatalogFilters> => {
    const raw = await searchParams;
    return parseCatalogFilters(categoryOverride ? { ...raw, kategoria: categoryOverride } : raw);
  },
);

/** Product counts per category (including its subtree, matching what selecting the checkbox actually filters to) under the currently active filters (excluding the category filter itself) — filter-dependent, so `cache()`d per-request rather than `unstable_cache`d, so checkbox counts track the active combination. */
export const getCategoryFacetCounts = cache(
  async (filters: CatalogFilters): Promise<Map<string, number>> => {
    const where = buildFacetWhere(filters, "category");
    const [rows, categories] = await Promise.all([
      prisma.product.groupBy({
        by: ["categoryId"],
        where,
        _count: { _all: true },
      }),
      getCategories(),
    ]);

    const directCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.categoryId != null) directCounts.set(r.categoryId, r._count._all);
    }

    // `computeSubtreeCounts` reads `_count.products`, so stub it with this
    // request's filtered direct counts before rolling up the subtree sums.
    const scopedCategories = categories.map((c) => ({
      ...c,
      _count: { products: directCounts.get(c.id) ?? 0 },
    }));
    return computeSubtreeCounts(scopedCategories);
  },
);

/** Product counts per brand under the currently active filters (excluding the brand filter itself) — filter-dependent, so `cache()`d per-request rather than `unstable_cache`d, so checkbox counts track the active combination. */
export const getBrandFacetCounts = cache(
  async (filters: CatalogFilters): Promise<Map<string, number>> => {
    const categoryIds = filters.category?.length
      ? await getCategoryDescendantIds(filters.category)
      : undefined;
    const where = buildFacetWhere(filters, "brand", categoryIds);
    const rows = await prisma.product.groupBy({
      by: ["brandId"],
      where,
      _count: { _all: true },
    });
    return new Map(
      rows
        .filter((r): r is typeof r & { brandId: string } => r.brandId != null)
        .map((r) => [r.brandId, r._count._all]),
    );
  },
);

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
        descriptionPl: true,
        image: true,
        parentId: true,
        parent: { select: { namePl: true, slug: true } },
      },
    }),
  ["category-by-slug"],
  { tags: ["categories"] },
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
        logo: true,
        website: true,
        countryCode: true,
      },
    }),
  ["brand-by-slug"],
  { tags: ["brands"] },
);

const RELATED_CANDIDATE_TAKE = 40;

export type RelatedProductSeed = {
  id: string;
  categorySlug?: string | null;
  brandSlug?: string | null;
  tagSlugs: string[];
};

/**
 * Weighted "similar products" pick for the PDP — shared tags count more than
 * shared category, which counts more than shared brand. Falls back to
 * featured, then newest, so the section is never empty.
 */
export const getRelatedProducts = unstable_cache(
  async (seed: RelatedProductSeed, take = 4) => getRelatedProductsUncached(seed, take),
  ["related-products"],
  { tags: ["products"] },
);

async function getRelatedProductsUncached(seed: RelatedProductSeed, take = 4) {
  const orConditions: Prisma.ProductWhereInput[] = [];
  if (seed.categorySlug) orConditions.push({ category: { slug: seed.categorySlug } });
  if (seed.brandSlug) orConditions.push({ brand: { slug: seed.brandSlug } });
  if (seed.tagSlugs.length) {
    orConditions.push({ tags: { some: { tag: { slug: { in: seed.tagSlugs } } } } });
  }

  const candidates = orConditions.length
    ? await prisma.product.findMany({
        where: { status: "ACTIVE", id: { not: seed.id }, OR: orConditions },
        take: RELATED_CANDIDATE_TAKE,
        orderBy: { updatedAt: "desc" },
        select: PRODUCT_LIST_SELECT,
      })
    : [];

  const ranked = candidates
    .map((item) => {
      const sharedTags = item.tags.filter((t) => seed.tagSlugs.includes(t.tag.slug)).length;
      const sameCategory = seed.categorySlug != null && item.category?.slug === seed.categorySlug;
      const sameBrand = seed.brandSlug != null && item.brand?.slug === seed.brandSlug;
      const inStock = item.variants.some((v) => v.stock > 0);
      const score =
        sharedTags * 3 + (sameCategory ? 2 : 0) + (sameBrand ? 1 : 0) + (inStock ? 1 : 0);
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
    .slice(0, take);

  if (ranked.length > 0) return ranked;

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

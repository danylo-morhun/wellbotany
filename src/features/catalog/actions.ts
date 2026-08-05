import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildProductOrderBy,
  buildProductWhere,
  type CatalogFilters,
  withStockAvailability,
} from "./lib/filters";
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

/** Every active product, search-relevant fields only — cached for fast, DB-free fuzzy search on every keystroke. */
export const getSearchableProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: PRODUCT_LIST_SELECT,
    }),
  ["searchable-products"],
  { tags: ["products"] },
);

function hasStructuralFilter(filters: CatalogFilters): boolean {
  return Boolean(
    filters.category ||
      filters.brand ||
      filters.tags?.length ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.onlyPromo ||
      filters.onlyNew ||
      filters.onlyFeatured,
  );
}

export async function getProducts(filters: CatalogFilters) {
  const where = buildProductWhere(filters);
  const orderBy = buildProductOrderBy(filters.sort);
  const skip = (filters.page - 1) * filters.perPage;

  // A search term with the default sort gets relevance-ranked instead of the
  // usual DB-paginated newest-first order; an explicit sort choice still wins.
  if (filters.search && filters.sort === "newest") {
    const matches = hasStructuralFilter(filters)
      ? await prisma.product.findMany({
          where,
          orderBy,
          take: RELEVANCE_CANDIDATE_CAP,
          select: PRODUCT_LIST_SELECT,
        })
      : await getSearchableProducts();
    const ranked = rankBySearchRelevance(matches, filters.search);
    const inStockRanked = ranked.filter((p) => p.variants.some((v) => v.stock > 0));
    const outOfStockRanked = ranked.filter((p) => !p.variants.some((v) => v.stock > 0));
    const items = [...inStockRanked, ...outOfStockRanked].slice(skip, skip + filters.perPage);
    return { items, total: ranked.length };
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
        isNewArrival: true,
        isFeatured: true,
        netWeight: true,
        servingSize: true,
        servingsPerContainer: true,
        storageInfo: true,
        countryOfOrigin: true,
        ingredients: true,
        nutritionFacts: true,
        allergenInfo: true,
        healthWarnings: true,
        ageRestriction: true,
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

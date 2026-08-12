import type { Prisma } from "@prisma/client";

export type SortOption = "newest" | "name_asc" | "name_desc";

export type CatalogFilters = {
  category?: string;
  brand?: string;
  tags?: string[];
  priceMin?: number; // grosz
  priceMax?: number; // grosz
  search?: string;
  onlyPromo?: boolean;
  onlyNew?: boolean;
  onlyFeatured?: boolean;
  page: number;
  perPage: number;
  sort: SortOption;
};

export const ITEMS_PER_PAGE = 24;

const VALID_SORTS: SortOption[] = ["newest", "name_asc", "name_desc"];

export function parseCatalogFilters(
  params: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const page = Math.max(1, Number(params.strona) || 1);
  const sortRaw = params.sortuj;
  const sort: SortOption =
    typeof sortRaw === "string" && VALID_SORTS.includes(sortRaw as SortOption)
      ? (sortRaw as SortOption)
      : "newest";

  return {
    category: typeof params.kategoria === "string" ? params.kategoria : undefined,
    brand: typeof params.marka === "string" ? params.marka : undefined,
    tags: typeof params.tagi === "string" ? params.tagi.split(",").filter(Boolean) : undefined,
    priceMin:
      typeof params.cenaMin === "string" && params.cenaMin !== ""
        ? Math.round(Number(params.cenaMin) * 100)
        : undefined,
    priceMax:
      typeof params.cenaMax === "string" && params.cenaMax !== ""
        ? Math.round(Number(params.cenaMax) * 100)
        : undefined,
    search: typeof params.szukaj === "string" ? params.szukaj : undefined,
    onlyPromo: params.promocje === "1" || undefined,
    onlyNew: params.nowosci === "1" || undefined,
    onlyFeatured: params.polecane === "1" || undefined,
    page,
    perPage: ITEMS_PER_PAGE,
    sort,
  };
}

export function buildProductWhere(
  filters: CatalogFilters,
  categoryIds?: string[],
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (categoryIds) {
    where.categoryId = { in: categoryIds };
  } else if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.brand) {
    where.brand = { slug: filters.brand };
  }
  if (filters.tags?.length) {
    where.tags = { some: { tag: { slug: { in: filters.tags } } } };
  }
  const hasPriceFilter = filters.priceMin !== undefined || filters.priceMax !== undefined;
  if (hasPriceFilter || filters.onlyPromo) {
    where.variants = {
      some: {
        isActive: true,
        ...(hasPriceFilter && { isDefault: true }),
        ...(filters.priceMin !== undefined && { pricePln: { gte: filters.priceMin } }),
        ...(filters.priceMax !== undefined && { pricePln: { lte: filters.priceMax } }),
        // Prisma cannot compare two columns; comparePricePln is only set when discounted
        ...(filters.onlyPromo && { comparePricePln: { not: null } }),
      },
    };
  }
  if (filters.onlyNew) {
    where.isNewArrival = true;
  }
  if (filters.onlyFeatured) {
    where.isFeatured = true;
  }
  // `filters.search` is intentionally not applied here as a DB `contains` —
  // Postgres/Prisma text matching is exact-substring only and can't tolerate
  // typos or "omega 3" vs "omega-3". Text relevance is handled downstream by
  // fuse.js (see search-relevance.ts) over the products this structural
  // where already narrowed down; this function only ever expresses
  // structural filters (category/brand/tags/price/flags).

  return where;
}

export function buildProductOrderBy(sort: SortOption): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "name_asc":
      return { namePl: "asc" };
    case "name_desc":
      return { namePl: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

const IN_STOCK_VARIANT_FILTER = { isActive: true, stock: { gt: 0 } } as const;

/**
 * Splits a catalog where-clause into "has an orderable variant" and "doesn't"
 * — Prisma can't order a to-many relation by anything but `_count`, so
 * in-stock-first is done by querying the two groups separately and
 * concatenating (see getProducts) instead of via `orderBy`.
 */
export function withStockAvailability(
  where: Prisma.ProductWhereInput,
  inStock: boolean,
): Prisma.ProductWhereInput {
  const existingSome =
    where.variants && "some" in where.variants ? (where.variants.some ?? {}) : {};

  if (inStock) {
    return { ...where, variants: { some: { ...existingSome, ...IN_STOCK_VARIANT_FILTER } } };
  }
  return { ...where, NOT: { variants: { some: IN_STOCK_VARIANT_FILTER } } };
}

export function buildCatalogUrl(base: string, overrides: Partial<CatalogFilters>): string {
  const params = new URLSearchParams();
  if (overrides.category) params.set("kategoria", overrides.category);
  if (overrides.brand) params.set("marka", overrides.brand);
  if (overrides.tags?.length) params.set("tagi", overrides.tags.join(","));
  if (overrides.priceMin) params.set("cenaMin", String(overrides.priceMin / 100));
  if (overrides.priceMax) params.set("cenaMax", String(overrides.priceMax / 100));
  if (overrides.search) params.set("szukaj", overrides.search);
  if (overrides.onlyPromo) params.set("promocje", "1");
  if (overrides.onlyNew) params.set("nowosci", "1");
  if (overrides.onlyFeatured) params.set("polecane", "1");
  if (overrides.sort && overrides.sort !== "newest") params.set("sortuj", overrides.sort);
  if (overrides.page && overrides.page > 1) params.set("strona", String(overrides.page));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

import type { Prisma, ProductStatus } from "@prisma/client";

export type ProductFilters = {
  search?: string;
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  noBrand?: boolean;
  noCategory?: boolean;
  noImage?: boolean;
};

/**
 * Shared with admin/produkty/page.tsx so bulk "select all matching" resolves
 * the same rows. `filters.search` is intentionally not applied here as a DB
 * `contains` — it can't tolerate typos or "omega 3" vs "omega-3". Text
 * relevance is ranked downstream via fuse.js over the rows this structural
 * where already narrowed down; this function only expresses structural
 * filters (status/brand/category/image).
 */
export function buildProductWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.noBrand) where.brandId = null;
  else if (filters.brandId) where.brandId = filters.brandId;
  if (filters.noCategory) where.categoryId = null;
  else if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.noImage) where.images = { none: {} };

  return where;
}

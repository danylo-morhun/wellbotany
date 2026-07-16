import { ProductStatus, TagType } from "@prisma/client";
import { z } from "zod";

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(120),
  namePl: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  nameUk: z.string().max(200).optional(),
  descriptionPl: z.string().max(2000).optional(),
  image: z.string().url().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().default(0),
  parentId: z.string().optional(),
});

export const brandSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  logo: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  countryCode: z.string().length(2).optional().or(z.literal("")),
});

export const tagSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(120),
  namePl: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  type: z.nativeEnum(TagType),
  sortOrder: z.coerce.number().int().default(0),
});

export const deleteByIdSchema = z.object({ id: z.string().min(1) });

// ─── Product ──────────────────────────────────────────────────────────────────

export const productSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1).max(200),
  status: z.nativeEnum(ProductStatus).default("DRAFT"),
  namePl: z.string().min(1).max(300),
  nameEn: z.string().max(300).optional(),
  nameUk: z.string().max(300).optional(),
  shortDescPl: z.string().max(500).optional(),
  shortDescEn: z.string().max(500).optional(),
  descriptionPl: z.string().optional(),
  descriptionEn: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  netWeight: z.string().max(50).optional(),
  servingSize: z.string().max(100).optional(),
  servingsPerContainer: z.coerce.number().int().positive().optional(),
  storageInfo: z.string().max(500).optional(),
  countryOfOrigin: z.string().length(2).optional().or(z.literal("")),
  healthWarnings: z.array(z.string()).default([]),
  ageRestriction: z.coerce.number().int().positive().optional(),
  metaTitlePl: z.string().max(120).optional(),
  metaTitleEn: z.string().max(120).optional(),
  metaDescPl: z.string().max(320).optional(),
  metaDescEn: z.string().max(320).optional(),
  tagIds: z.array(z.string()).default([]),
});

// ─── Variant ──────────────────────────────────────────────────────────────────

export const variantSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  sku: z.string().min(1).max(100),
  ean: z.string().max(20).optional(),
  optionLabel: z.string().max(100).optional(),
  optionValue: z.string().max(100).optional(),
  pricePln: z.coerce.number().int().positive(),
  comparePricePln: z.coerce.number().int().positive().optional(),
  costPricePln: z.coerce.number().int().positive().optional(),
  vatRate: z.coerce.number().min(0).max(100).default(5),
  stock: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  trackStock: z.boolean().default(true),
  weightGrams: z.coerce.number().int().positive().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// ─── Stock bulk update ─────────────────────────────────────────────────────────

export const bulkUpdateStockSchema = z.object({
  updates: z.array(
    z.object({
      variantId: z.string().min(1),
      stock: z.coerce.number().int().min(0),
    }),
  ),
});

// ─── Product bulk operations ───────────────────────────────────────────────────

// Nested under `filters` (not flattened) so bulkAssignBrand/bulkAssignCategory's own
// `brandId`/`categoryId` target field never collides with the filter of the same name.
export const productFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  noBrand: z.boolean().optional(),
  noCategory: z.boolean().optional(),
  noImage: z.boolean().optional(),
});

/**
 * "ids" = explicit selection (current page checkboxes).
 * "all" = every product matching `filters` (cross-page "select all"), minus excludedIds
 * for rows the admin unchecked after selecting all.
 */
export const productSelectionSchema = z.object({
  mode: z.enum(["ids", "all"]),
  ids: z.array(z.string().min(1)).default([]),
  excludedIds: z.array(z.string().min(1)).default([]),
  filters: productFiltersSchema.default({}),
});

export const bulkUpdateProductStatusSchema = productSelectionSchema.extend({
  status: z.nativeEnum(ProductStatus),
});

export const bulkAssignBrandSchema = productSelectionSchema.extend({
  brandId: z.string().min(1).nullable(),
});

export const bulkAssignCategorySchema = productSelectionSchema.extend({
  categoryId: z.string().min(1).nullable(),
});

export const bulkDeleteProductsSchema = productSelectionSchema.extend({
  skipConflicts: z.boolean().default(false),
});

// ─── Product image ─────────────────────────────────────────────────────────────

export const productImageSchema = z.object({
  productId: z.string().min(1),
  url: z.string().min(1),
  altPl: z.string().max(200).optional(),
  sortOrder: z.coerce.number().int().default(0),
  isMain: z.boolean().default(false),
});

export const deleteImageSchema = z.object({
  imageId: z.string().min(1),
  productId: z.string().min(1),
});

export type CategoryInput = z.input<typeof categorySchema>;
export type BrandInput = z.input<typeof brandSchema>;
export type TagInput = z.input<typeof tagSchema>;
export type ProductInput = z.input<typeof productSchema>;
export type VariantInput = z.input<typeof variantSchema>;
export type BulkUpdateStockInput = z.input<typeof bulkUpdateStockSchema>;
export type ProductFiltersInput = z.input<typeof productFiltersSchema>;
export type ProductSelectionInput = z.input<typeof productSelectionSchema>;

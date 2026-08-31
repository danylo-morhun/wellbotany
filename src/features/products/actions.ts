"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { rankBySearchRelevance } from "@/features/catalog/lib/search-relevance";
import { ActionError } from "@/lib/action-error";
import { syncProductToBaselinker, syncStockToBaselinker } from "@/lib/baselinker/inventory";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { buildProductWhere } from "./lib/where";
import {
  brandSchema,
  bulkAssignBrandSchema,
  bulkAssignCategorySchema,
  bulkDeleteProductsSchema,
  bulkUpdateProductStatusSchema,
  bulkUpdateStockSchema,
  categorySchema,
  deleteByIdSchema,
  deleteImageSchema,
  type ProductSelectionInput,
  productImageSchema,
  productSchema,
  quickUpdateVariantSchema,
  tagSchema,
  variantSchema,
} from "./schema";

/** Resolves a selection ("ids" or "all matching filters") to a concrete list of product ids. */
async function resolveProductIds(selection: ProductSelectionInput): Promise<string[]> {
  if (selection.mode === "ids") return selection.ids ?? [];
  const filters = selection.filters ?? {};
  const where = buildProductWhere(filters);
  const excluded = new Set(selection.excludedIds ?? []);

  if (filters.search) {
    const candidates = await prisma.product.findMany({
      where,
      select: {
        id: true,
        namePl: true,
        slug: true,
        brand: { select: { name: true } },
        category: { select: { namePl: true } },
      },
    });
    const ranked = rankBySearchRelevance(candidates, filters.search);
    return ranked.map((p) => p.id).filter((id) => !excluded.has(id));
  }

  const matching = await prisma.product.findMany({ where, select: { id: true } });
  return matching.map((p) => p.id).filter((id) => !excluded.has(id));
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const saveCategory = adminActionClient
  .schema(categorySchema)
  .action(async ({ parsedInput: input }) => {
    const { id, image, icon, nameEn, nameUk, descriptionPl, parentId, ...data } = input;
    const payload = {
      ...data,
      image: image || null,
      icon: icon || null,
      nameEn: nameEn || null,
      nameUk: nameUk || null,
      descriptionPl: descriptionPl || null,
      parentId: parentId || null,
    };
    let savedId: string;
    if (id) {
      await prisma.category.update({ where: { id }, data: payload });
      savedId = id;
    } else {
      const created = await prisma.category.create({ data: payload });
      savedId = created.id;
    }
    revalidatePath("/admin/kategorie");
    revalidatePath("/katalog", "layout");
    revalidateTag("categories", "max");
    return { success: true, id: savedId };
  });

export const deleteCategory = adminActionClient
  .schema(deleteByIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/kategorie");
    revalidatePath("/katalog", "layout");
    revalidateTag("categories", "max");
    return { success: true };
  });

// ─── Brands ───────────────────────────────────────────────────────────────────

export const saveBrand = adminActionClient
  .schema(brandSchema)
  .action(async ({ parsedInput: input }) => {
    const { id, logo, website, description, countryCode, parentBrandId, ...data } = input;
    const payload = {
      ...data,
      logo: logo || null,
      website: website || null,
      description: description || null,
      countryCode: countryCode || null,
      parentBrandId: parentBrandId || null,
    };
    let savedId: string;
    if (id) {
      await prisma.brand.update({ where: { id }, data: payload });
      savedId = id;
    } else {
      const created = await prisma.brand.create({ data: payload });
      savedId = created.id;
    }
    revalidatePath("/admin/marki");
    revalidatePath("/marki", "layout");
    revalidateTag("brands", "max");
    return { success: true, id: savedId };
  });

export const deleteBrand = adminActionClient
  .schema(deleteByIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.brand.delete({ where: { id } });
    revalidatePath("/admin/marki");
    revalidatePath("/marki", "layout");
    revalidateTag("brands", "max");
    return { success: true };
  });

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const saveTag = adminActionClient
  .schema(tagSchema)
  .action(async ({ parsedInput: input }) => {
    const { id, iconUrl, nameEn, ...data } = input;
    const payload = {
      ...data,
      iconUrl: iconUrl || null,
      nameEn: nameEn || null,
    };
    if (id) {
      await prisma.tag.update({ where: { id }, data: payload });
    } else {
      await prisma.tag.create({ data: payload });
    }
    revalidatePath("/admin/tagi");
    revalidateTag("tags", "max");
    return { success: true };
  });

export const deleteTag = adminActionClient
  .schema(deleteByIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    await prisma.tag.delete({ where: { id } });
    revalidatePath("/admin/tagi");
    revalidateTag("tags", "max");
    return { success: true };
  });

// ─── Products ─────────────────────────────────────────────────────────────────

export const saveProduct = adminActionClient
  .schema(productSchema)
  .action(async ({ parsedInput: input }) => {
    const { id, tagIds, categoryId, brandId, countryOfOrigin, ...data } = input;
    const payload = {
      ...data,
      categoryId: categoryId || null,
      brandId: brandId || null,
      countryOfOrigin: countryOfOrigin || null,
    };

    let savedId: string | undefined;
    await prisma.$transaction(async (tx) => {
      let resolvedId = id;
      if (resolvedId) {
        await tx.product.update({ where: { id: resolvedId }, data: payload });
      } else {
        const created = await tx.product.create({ data: payload });
        resolvedId = created.id;
      }
      savedId = resolvedId;
      // Sync tags
      await tx.productTag.deleteMany({ where: { productId: resolvedId } });
      if (tagIds.length > 0) {
        await tx.productTag.createMany({
          data: tagIds.map((tagId) => ({ productId: resolvedId as string, tagId })),
        });
      }
    });

    revalidatePath("/admin/produkty");
    if (savedId) revalidatePath(`/admin/produkty/${savedId}`);
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    if (savedId) void syncProductToBaselinker(savedId).catch(console.error);
    return { success: true, id: savedId };
  });

export const deleteProduct = adminActionClient
  .schema(deleteByIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    const hasOrders = await prisma.orderItem.findFirst({
      where: { variant: { productId: id } },
    });
    if (hasOrders) {
      throw new ActionError("Nie można usunąć produktu z przypisanymi zamówieniami");
    }
    await prisma.product.delete({ where: { id } });
    revalidatePath("/admin/produkty");
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true };
  });

// ─── Variants ─────────────────────────────────────────────────────────────────

export const saveVariant = adminActionClient
  .schema(variantSchema)
  .action(async ({ parsedInput: input }) => {
    const {
      id,
      ean,
      optionLabel,
      optionValue,
      comparePricePln,
      costPricePln,
      weightGrams,
      ...data
    } = input;
    const payload = {
      ...data,
      ean: ean || null,
      optionLabel: optionLabel || null,
      optionValue: optionValue || null,
      comparePricePln: comparePricePln ?? null,
      costPricePln: costPricePln ?? null,
      weightGrams: weightGrams ?? null,
    };
    if (id) {
      await prisma.productVariant.update({ where: { id }, data: payload });
    } else {
      await prisma.productVariant.create({ data: payload });
    }
    revalidatePath("/admin/produkty");
    revalidatePath(`/admin/produkty/${input.productId}`);
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    void syncProductToBaselinker(input.productId).catch(console.error);
    return { success: true };
  });

export const deleteVariant = adminActionClient
  .schema(deleteByIdSchema)
  .action(async ({ parsedInput: { id } }) => {
    const hasOrders = await prisma.orderItem.findFirst({ where: { variantId: id } });
    if (hasOrders) {
      throw new ActionError("Nie można usunąć wariantu z przypisanymi zamówieniami");
    }
    await prisma.productVariant.delete({ where: { id } });
    revalidatePath("/admin/produkty");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true };
  });

/** Inline price/stock edit from the admin products list, without opening the full form. */
export const quickUpdateVariant = adminActionClient
  .schema(quickUpdateVariantSchema)
  .action(async ({ parsedInput: { variantId, pricePln, stock } }) => {
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: { pricePln, stock },
      select: { productId: true },
    });
    revalidatePath("/admin/produkty");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    void syncProductToBaselinker(variant.productId).catch(console.error);
    return { success: true };
  });

// ─── Bulk stock ───────────────────────────────────────────────────────────────

export const bulkUpdateStock = adminActionClient
  .schema(bulkUpdateStockSchema)
  .action(async ({ parsedInput: { updates } }) => {
    await prisma.$transaction(
      updates.map(({ variantId, stock }) =>
        prisma.productVariant.update({ where: { id: variantId }, data: { stock } }),
      ),
    );

    // Push stock to BaseLinker (fire-and-forget)
    const variantIds = updates.map((u) => u.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, baselinkerVariantId: { not: null } },
      select: { id: true, baselinkerVariantId: true, stock: true },
    });
    if (variants.length > 0) {
      void syncStockToBaselinker(
        variants.map((v) => ({ blVariantId: v.baselinkerVariantId!, stock: v.stock })),
      ).catch(console.error);
    }

    revalidatePath("/admin/magazyn");
    return { success: true };
  });

// ─── Product bulk operations ───────────────────────────────────────────────────

export const bulkUpdateProductStatus = adminActionClient
  .schema(bulkUpdateProductStatusSchema)
  .action(async ({ parsedInput: { status, ...selection } }) => {
    const ids = await resolveProductIds(selection);
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    revalidatePath("/admin/produkty");
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true, count };
  });

export const bulkAssignBrand = adminActionClient
  .schema(bulkAssignBrandSchema)
  .action(async ({ parsedInput: { brandId, ...selection } }) => {
    const ids = await resolveProductIds(selection);
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { brandId },
    });
    revalidatePath("/admin/produkty");
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true, count };
  });

export const bulkAssignCategory = adminActionClient
  .schema(bulkAssignCategorySchema)
  .action(async ({ parsedInput: { categoryId, ...selection } }) => {
    const ids = await resolveProductIds(selection);
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { categoryId },
    });
    revalidatePath("/admin/produkty");
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true, count };
  });

export const bulkDeleteProducts = adminActionClient
  .schema(bulkDeleteProductsSchema)
  .action(async ({ parsedInput: { skipConflicts, ...selection } }) => {
    const ids = await resolveProductIds(selection);

    const withOrders = await prisma.orderItem.findMany({
      where: { variant: { productId: { in: ids } } },
      select: { variant: { select: { productId: true } } },
      distinct: ["variantId"],
    });
    const conflictIds = new Set(
      withOrders.flatMap((o) => (o.variant ? [o.variant.productId] : [])),
    );
    const deletableIds = ids.filter((id) => !conflictIds.has(id));

    if (conflictIds.size > 0 && !skipConflicts) {
      return {
        success: true,
        requiresConfirmation: true,
        conflictCount: conflictIds.size,
        deletableCount: deletableIds.length,
      };
    }

    await prisma.product.deleteMany({ where: { id: { in: deletableIds } } });
    revalidatePath("/admin/produkty");
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return {
      success: true,
      requiresConfirmation: false,
      deletedCount: deletableIds.length,
      skippedCount: conflictIds.size,
    };
  });

// ─── Product images ───────────────────────────────────────────────────────────

export const addProductImage = adminActionClient
  .schema(productImageSchema)
  .action(async ({ parsedInput: input }) => {
    const { altPl, ...data } = input;
    await prisma.productImage.create({
      data: { ...data, altPl: altPl || null },
    });
    revalidatePath("/admin/produkty");
    revalidatePath(`/admin/produkty/${input.productId}`);
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true };
  });

export const deleteProductImage = adminActionClient
  .schema(deleteImageSchema)
  .action(async ({ parsedInput: { imageId, productId } }) => {
    await prisma.productImage.delete({ where: { id: imageId } });
    revalidatePath("/admin/produkty");
    revalidatePath(`/admin/produkty/${productId}`);
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    return { success: true };
  });

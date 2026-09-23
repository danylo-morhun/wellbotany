import fs from "node:fs";
import path from "node:path";
import type { Prisma, ProductStatus } from "@prisma/client";
import { slugify } from "@/lib/slugify";
import { onlyEmptyFields } from "./merge";
import type {
  ImportRowResult,
  ImportSummary,
  SupplierProductDraft,
  SupplierVariantDraft,
} from "./types";

type Tx = Prisma.TransactionClient;

async function uniqueSlug(tx: Tx, base: string): Promise<string> {
  let slug = slugify(base);
  let counter = 1;
  while (await tx.product.findUnique({ where: { slug } })) {
    slug = `${slugify(base)}-${counter}`;
    counter++;
  }
  return slug;
}

async function resolveBrand(tx: Tx, brandName: string, brandSlug: string): Promise<string> {
  const existing = await tx.brand.findUnique({ where: { slug: brandSlug } });
  if (existing) return existing.id;
  const created = await tx.brand.create({
    data: { slug: brandSlug, name: brandName },
  });
  return created.id;
}

async function resolveCategory(tx: Tx, categoryName: string | undefined): Promise<string | null> {
  if (!categoryName) return null;
  const slug = slugify(categoryName);
  const existing = await tx.category.findUnique({ where: { slug } });
  if (existing) return existing.id;
  const created = await tx.category.create({
    data: { slug, namePl: categoryName },
  });
  return created.id;
}

async function findExistingVariantByCodes(
  tx: Tx,
  ean: string | undefined,
  sku: string | undefined,
): Promise<{ productId: string; variantId: string } | null> {
  if (ean) {
    const byEan = await tx.productVariant.findUnique({
      where: { ean },
      select: { id: true, productId: true },
    });
    if (byEan) return { productId: byEan.productId, variantId: byEan.id };
  }
  if (sku) {
    const bySku = await tx.productVariant.findUnique({
      where: { sku },
      select: { id: true, productId: true },
    });
    if (bySku) return { productId: bySku.productId, variantId: bySku.id };
  }
  return null;
}

async function findExistingVariant(
  tx: Tx,
  draft: SupplierProductDraft,
): Promise<{ productId: string; variantId: string } | null> {
  return findExistingVariantByCodes(tx, draft.ean, draft.sku);
}

function resolveImageUrl(draft: SupplierProductDraft): string | undefined {
  if (draft.imageUrl) return draft.imageUrl;
  if (!draft.localImagePath || !fs.existsSync(draft.localImagePath)) return undefined;

  const destDir = path.join(process.cwd(), "public/supplier-images");
  fs.mkdirSync(destDir, { recursive: true });
  const filename = path.basename(draft.localImagePath);
  const dest = path.join(destDir, filename);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(draft.localImagePath, dest);
  }
  return `/supplier-images/${filename}`;
}

async function ensureProductImage(
  tx: Tx,
  productId: string,
  url: string,
  altPl: string,
): Promise<void> {
  const existing = await tx.productImage.findFirst({
    where: { productId, url },
  });
  if (existing) return;

  const hasMain = await tx.productImage.findFirst({
    where: { productId, isMain: true },
  });

  await tx.productImage.create({
    data: {
      productId,
      url,
      altPl,
      isMain: !hasMain,
      sortOrder: 0,
    },
  });
}

async function ensureGalleryImages(
  tx: Tx,
  productId: string,
  urls: string[] | undefined,
  altPl: string,
): Promise<void> {
  if (!urls?.length) return;
  for (const url of urls) {
    await ensureProductImage(tx, productId, url, altPl);
  }
}

/** Extra content fields shared by both the create and update paths — kept in one
 *  place so a new draft field only needs wiring here, not in both branches. */
const CONTENT_FIELDS = {
  shortDescPl: true,
  descriptionPl: true,
  ingredients: true,
  nutritionFacts: true,
  healthWarnings: true,
  servingSize: true,
  servingsPerContainer: true,
  storageInfo: true,
  usageInstructionsPl: true,
  benefitsPl: true,
  allergenInfo: true,
  responsibleEntity: true,
  countryOfOrigin: true,
  netWeight: true,
} as const;

function contentUpdateData(draft: SupplierProductDraft) {
  return {
    shortDescPl: draft.shortDescPl ?? undefined,
    descriptionPl: draft.descriptionPl ?? undefined,
    ingredients: draft.ingredientsPl ? { pl: draft.ingredientsPl } : undefined,
    nutritionFacts:
      draft.nutritionFacts && draft.nutritionFacts.length > 0
        ? draft.nutritionFacts
        : draft.nutritionFactsPl
          ? { pl: draft.nutritionFactsPl }
          : undefined,
    healthWarnings:
      draft.healthWarnings && draft.healthWarnings.length > 0
        ? draft.healthWarnings
        : draft.healthWarningsPl
          ? [draft.healthWarningsPl]
          : undefined,
    servingSize: draft.servingSize ?? undefined,
    servingsPerContainer: draft.servingsPerContainer ?? undefined,
    storageInfo: draft.storageInfo ?? undefined,
    usageInstructionsPl: draft.usageInstructionsPl ?? undefined,
    benefitsPl: draft.benefitsPl && draft.benefitsPl.length > 0 ? draft.benefitsPl : undefined,
    allergenInfo:
      draft.allergenContains?.length || draft.allergenMayContain?.length
        ? { contains: draft.allergenContains ?? [], mayContain: draft.allergenMayContain ?? [] }
        : undefined,
    responsibleEntity: draft.responsibleEntity ?? undefined,
    countryOfOrigin: draft.countryOfOrigin ?? undefined,
  };
}

function brandSlugFallback(name: string): string {
  return slugify(name);
}

/** Upserts one ProductVariant of a multi-variant draft (own SKU/EAN/price per
 *  packaging size). Matched independently by its own EAN/SKU — a re-run can
 *  add a newly-scraped packaging size to an existing product without
 *  touching the sibling variants already there. */
async function upsertVariant(
  tx: Tx,
  productId: string,
  draft: SupplierProductDraft,
  variant: SupplierVariantDraft,
  fallbackSku: string,
): Promise<void> {
  const existing = await findExistingVariantByCodes(tx, variant.ean, variant.sku);
  const data = {
    optionLabel: variant.optionLabel ?? "Wielkość opakowania",
    optionValue: variant.optionValue,
    pricePln: variant.priceGrosz,
    comparePricePln: variant.comparePriceGrosz ?? null,
    vatRate: draft.vatRate,
    stock: variant.stock,
    isActive: variant.priceGrosz > 0,
  };
  if (existing) {
    await tx.productVariant.update({ where: { id: existing.variantId }, data });
    return;
  }
  await tx.productVariant.create({
    data: {
      ...data,
      productId,
      sku: variant.sku ?? fallbackSku,
      ean: variant.ean || null,
      isDefault: variant.isDefault ?? false,
    },
  });
}

/** Multi-variant path: one Product, one ProductVariant per `draft.variants`
 *  entry (own EAN/price each — see `SupplierVariantDraft`). The anchor
 *  product is found by matching ANY variant's EAN/SKU against an existing
 *  ProductVariant, so a re-run recognizes the product even if only one of
 *  its packaging sizes was imported before. */
async function importVariantDraft(
  tx: Tx,
  draft: SupplierProductDraft & { variants: SupplierVariantDraft[] },
  options: {
    brandName?: string;
    brandSlug?: string;
    updateExisting?: boolean;
    status?: ProductStatus;
  },
  brandIdFor: (draft: SupplierProductDraft) => Promise<string | null>,
): Promise<ImportRowResult> {
  let anchorProductId: string | null = null;
  for (const v of draft.variants) {
    const found = await findExistingVariantByCodes(tx, v.ean, v.sku);
    if (found) {
      anchorProductId = found.productId;
      break;
    }
  }

  if (anchorProductId && !options.updateExisting) {
    return {
      externalKey: draft.externalKey,
      name: draft.name,
      status: "skipped",
      productId: anchorProductId,
      message: "Produkt już istnieje",
    };
  }

  const imageUrl = resolveImageUrl(draft);
  const brandId = await brandIdFor(draft);

  let productId: string;
  let rowStatus: ImportRowResult["status"];

  if (anchorProductId) {
    productId = anchorProductId;
    // Name, category and filled content are curated in the shop — keep them.
    const current = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: CONTENT_FIELDS,
    });
    await tx.product.update({
      where: { id: productId },
      data: {
        brandId,
        ...onlyEmptyFields(current, {
          ...contentUpdateData(draft),
          netWeight: draft.packaging ?? undefined,
        }),
      },
    });
    rowStatus = "updated";
  } else {
    const slug = await uniqueSlug(tx, draft.name);
    const categoryId = await resolveCategory(tx, draft.categoryName);
    const product = await tx.product.create({
      data: {
        slug,
        status: options.status ?? "DRAFT",
        namePl: draft.name,
        brandId,
        categoryId,
        netWeight: draft.packaging ?? null,
        ...contentUpdateData(draft),
        ...(categoryId && { categoryLinks: { create: { categoryId } } }),
      },
    });
    productId = product.id;
    rowStatus = "created";
  }

  const hasDefault = draft.variants.some((v) => v.isDefault);
  for (const [i, v] of draft.variants.entries()) {
    const fallbackSku = `${draft.sourceId.toUpperCase()}-${draft.externalKey}-${slugify(v.optionValue)}`;
    await upsertVariant(
      tx,
      productId,
      draft,
      hasDefault ? v : { ...v, isDefault: i === 0 },
      fallbackSku,
    );
  }

  if (imageUrl) {
    await ensureProductImage(tx, productId, imageUrl, draft.name);
  }
  await ensureGalleryImages(tx, productId, draft.extraImageUrls, draft.name);

  return { externalKey: draft.externalKey, name: draft.name, status: rowStatus, productId };
}

export async function importSupplierProducts(
  tx: Tx,
  drafts: SupplierProductDraft[],
  options: {
    brandName?: string;
    brandSlug?: string;
    updateExisting?: boolean;
    /** Status new products are created with. Defaults to DRAFT (review before going live). */
    status?: ProductStatus;
  },
): Promise<ImportSummary> {
  const rows: ImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const brandCache = new Map<string, string>();
  // No brand on the draft and no source-level fallback (e.g. Shoper, where
  // most producers are genuinely unset) means the product really has no
  // brand — leave brandId null rather than inventing a placeholder.
  const brandIdFor = async (draft: SupplierProductDraft): Promise<string | null> => {
    const name = (draft.brandName || options.brandName || "").trim();
    if (!name) return null;
    const slug = (draft.brandSlug || brandSlugFallback(name) || options.brandSlug || "").trim();
    const key = `${slug}:${name}`;
    const cached = brandCache.get(key);
    if (cached) return cached;
    const id = await resolveBrand(tx, name, slug);
    brandCache.set(key, id);
    return id;
  };

  for (const draft of drafts) {
    try {
      if (draft.variants && draft.variants.length > 0) {
        const row = await importVariantDraft(
          tx,
          draft as SupplierProductDraft & { variants: SupplierVariantDraft[] },
          options,
          brandIdFor,
        );
        if (row.status === "created") created++;
        else if (row.status === "updated") updated++;
        else if (row.status === "skipped") skipped++;
        rows.push(row);
        continue;
      }

      const existing = await findExistingVariant(tx, draft);
      const imageUrl = resolveImageUrl(draft);
      const brandId = await brandIdFor(draft);

      if (existing && options.updateExisting) {
        // A zero-price draft (Formeds/HealthLabs-style "descriptions only"
        // source) must never clobber an existing listing's real price, stock,
        // or brand — the same EAN can legitimately be resold by multiple
        // suppliers, and only the priced one should own that commercial data.
        // It can still enrich the empty content fields.
        const hasRealPrice = draft.priceGrosz > 0;

        await tx.productVariant.update({
          where: { id: existing.variantId },
          data: {
            ...(hasRealPrice && {
              pricePln: draft.priceGrosz,
              costPricePln: draft.costPriceGrosz ?? null,
              stock: draft.stock,
              vatRate: draft.vatRate,
              isActive: true,
            }),
            shoperProductId: draft.externalProductId ?? undefined,
          },
        });
        // Name, category and filled content are curated in the shop — keep them.
        const current = await tx.product.findUniqueOrThrow({
          where: { id: existing.productId },
          select: CONTENT_FIELDS,
        });
        await tx.product.update({
          where: { id: existing.productId },
          data: {
            ...(hasRealPrice && { brandId }),
            ...onlyEmptyFields(current, {
              ...contentUpdateData(draft),
              ...(hasRealPrice && { netWeight: draft.packaging ?? undefined }),
            }),
          },
        });
        if (imageUrl) {
          await ensureProductImage(tx, existing.productId, imageUrl, draft.name);
        }
        await ensureGalleryImages(tx, existing.productId, draft.extraImageUrls, draft.name);
        updated++;
        rows.push({
          externalKey: draft.externalKey,
          name: draft.name,
          status: "updated",
          productId: existing.productId,
        });
        continue;
      }

      if (existing) {
        skipped++;
        rows.push({
          externalKey: draft.externalKey,
          name: draft.name,
          status: "skipped",
          productId: existing.productId,
          message: "Produkt już istnieje",
        });
        continue;
      }

      const slug = await uniqueSlug(tx, draft.name);
      const categoryId = await resolveCategory(tx, draft.categoryName);

      const product = await tx.product.create({
        data: {
          slug,
          status: options.status ?? "DRAFT",
          namePl: draft.name,
          brandId,
          categoryId,
          netWeight: draft.packaging ?? null,
          ...contentUpdateData(draft),
          ...(categoryId && { categoryLinks: { create: { categoryId } } }),
        },
      });

      const sku = draft.sku ?? `${draft.sourceId.toUpperCase()}-${draft.externalKey}`;

      await tx.productVariant.create({
        data: {
          productId: product.id,
          sku,
          ean: draft.ean || null, // "" would collide with the unique constraint like a real value
          optionValue: draft.packaging ?? null,
          pricePln: draft.priceGrosz,
          costPricePln: draft.costPriceGrosz ?? null,
          vatRate: draft.vatRate,
          stock: draft.stock,
          isDefault: true,
          isActive: draft.priceGrosz > 0,
          shoperProductId: draft.externalProductId ?? null,
        },
      });

      if (imageUrl) {
        await ensureProductImage(tx, product.id, imageUrl, draft.name);
      }
      await ensureGalleryImages(tx, product.id, draft.extraImageUrls, draft.name);

      created++;
      rows.push({
        externalKey: draft.externalKey,
        name: draft.name,
        status: "created",
        productId: product.id,
      });
    } catch (error) {
      errors++;
      rows.push({
        externalKey: draft.externalKey,
        name: draft.name,
        status: "error",
        message: error instanceof Error ? error.message : "Nieznany błąd",
      });
    }
  }

  return { created, updated, skipped, errors, rows };
}

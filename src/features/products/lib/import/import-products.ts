import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { slugify } from "@/lib/slugify";
import type { ImportRowResult, ImportSummary, SupplierProductDraft } from "./types";

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

async function findExistingVariant(
  tx: Tx,
  draft: SupplierProductDraft,
): Promise<{ productId: string; variantId: string } | null> {
  if (draft.ean) {
    const byEan = await tx.productVariant.findUnique({
      where: { ean: draft.ean },
      select: { id: true, productId: true },
    });
    if (byEan) return { productId: byEan.productId, variantId: byEan.id };
  }
  if (draft.sku) {
    const bySku = await tx.productVariant.findUnique({
      where: { sku: draft.sku },
      select: { id: true, productId: true },
    });
    if (bySku) return { productId: bySku.productId, variantId: bySku.id };
  }
  return null;
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

function brandSlugFallback(name: string): string {
  return slugify(name);
}

export async function importSupplierProducts(
  tx: Tx,
  drafts: SupplierProductDraft[],
  options: { brandName?: string; brandSlug?: string; updateExisting?: boolean },
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
        await tx.product.update({
          where: { id: existing.productId },
          data: {
            ...(hasRealPrice && {
              namePl: draft.name,
              brandId,
              categoryId: await resolveCategory(tx, draft.categoryName),
              netWeight: draft.packaging ?? undefined,
            }),
            shortDescPl: draft.shortDescPl ?? undefined,
            descriptionPl: draft.descriptionPl ?? undefined,
            ingredients: draft.ingredientsPl ? { pl: draft.ingredientsPl } : undefined,
            nutritionFacts: draft.nutritionFactsPl ? { pl: draft.nutritionFactsPl } : undefined,
            healthWarnings: draft.healthWarningsPl ? [draft.healthWarningsPl] : undefined,
            servingSize: draft.servingSize ?? undefined,
            servingsPerContainer: draft.servingsPerContainer ?? undefined,
            storageInfo: draft.storageInfo ?? undefined,
          },
        });
        if (imageUrl) {
          await ensureProductImage(tx, existing.productId, imageUrl, draft.name);
        }
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
          status: "DRAFT",
          namePl: draft.name,
          brandId,
          categoryId,
          netWeight: draft.packaging ?? null,
          shortDescPl: draft.shortDescPl ?? null,
          descriptionPl: draft.descriptionPl ?? null,
          ingredients: draft.ingredientsPl ? { pl: draft.ingredientsPl } : undefined,
          nutritionFacts: draft.nutritionFactsPl ? { pl: draft.nutritionFactsPl } : undefined,
          healthWarnings: draft.healthWarningsPl ? [draft.healthWarningsPl] : undefined,
          servingSize: draft.servingSize ?? null,
          servingsPerContainer: draft.servingsPerContainer ?? null,
          storageInfo: draft.storageInfo ?? null,
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

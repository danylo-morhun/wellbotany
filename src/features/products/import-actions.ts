"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { syncProductToBaselinker } from "@/lib/baselinker/inventory";
import { prisma } from "@/lib/prisma";
import { adminActionClient } from "@/lib/safe-action";
import { importSupplierProducts } from "./lib/import/import-products";
import { loadSupplierProducts, sourceFileExists } from "./lib/import/parse-supplier-file";
import { SUPPLIER_SOURCES } from "./lib/import/sources";

const previewSchema = z.object({
  sourceId: z.string().min(1),
});

const importSchema = z.object({
  sourceId: z.string().min(1),
  externalKeys: z.array(z.string()).min(1),
  updateExisting: z.boolean().default(true),
});

export const previewSupplierImport = adminActionClient
  .schema(previewSchema)
  .action(async ({ parsedInput: { sourceId } }) => {
    const source = SUPPLIER_SOURCES.find((s) => s.id === sourceId);
    if (!source) throw new Error("Nieznane źródło dostawcy");

    if (!sourceFileExists(source)) {
      throw new Error(
        source.kind === "file" ? `Brak pliku: ${source.filePath}` : "Brak konfiguracji API w .env",
      );
    }

    const products = await loadSupplierProducts(source);

    const eans = products.map((p) => p.ean).filter(Boolean) as string[];
    const skus = products.map((p) => p.sku).filter(Boolean) as string[];

    const existingVariants = await prisma.productVariant.findMany({
      where: {
        OR: [
          ...(eans.length ? [{ ean: { in: eans } }] : []),
          ...(skus.length ? [{ sku: { in: skus } }] : []),
        ],
      },
      select: { ean: true, sku: true },
    });

    const existingKeys = new Set([
      ...existingVariants.map((v) => v.ean).filter(Boolean),
      ...existingVariants.map((v) => v.sku).filter(Boolean),
    ]);

    return {
      source,
      products: products.map((p) => ({
        externalKey: p.externalKey,
        name: p.name,
        categoryName: p.categoryName ?? null,
        sku: p.sku ?? null,
        ean: p.ean ?? null,
        priceGrosz: p.priceGrosz,
        stock: p.stock,
        hasImage: Boolean(p.imageUrl || p.localImagePath),
        existsInDb: existingKeys.has(p.ean ?? "") || existingKeys.has(p.sku ?? ""),
      })),
      total: products.length,
    };
  });

export const runSupplierImport = adminActionClient
  .schema(importSchema)
  .action(async ({ parsedInput: { sourceId, externalKeys, updateExisting } }) => {
    const source = SUPPLIER_SOURCES.find((s) => s.id === sourceId);
    if (!source) throw new Error("Nieznane źródło dostawcy");

    const allProducts = await loadSupplierProducts(source);
    const keySet = new Set(externalKeys);
    const selected = allProducts.filter((p) => keySet.has(p.externalKey));

    if (selected.length === 0) {
      throw new Error("Nie wybrano produktów do importu");
    }

    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      rows: [],
    } as Awaited<ReturnType<typeof importSupplierProducts>>;

    for (const draft of selected) {
      const rowSummary = await prisma.$transaction((tx) =>
        importSupplierProducts(tx, [draft], {
          brandName: source.brandName,
          brandSlug: source.brandSlug,
          updateExisting,
        }),
      );

      summary.created += rowSummary.created;
      summary.updated += rowSummary.updated;
      summary.skipped += rowSummary.skipped;
      summary.errors += rowSummary.errors;
      summary.rows.push(...rowSummary.rows);
    }

    const productIds = summary.rows
      .filter((r) => r.productId && (r.status === "created" || r.status === "updated"))
      .map((r) => r.productId as string);

    for (const productId of [...new Set(productIds)]) {
      void syncProductToBaselinker(productId).catch(console.error);
    }

    revalidatePath("/admin/produkty");
    revalidatePath("/admin/produkty/import");
    revalidatePath("/katalog", "layout");
    revalidatePath("/produkt/[slug]", "page");
    revalidateTag("products", "max");
    revalidateTag("categories", "max");
    revalidateTag("brands", "max");

    return summary;
  });

export async function getSupplierSourcesForPage() {
  return SUPPLIER_SOURCES.map((source) => ({
    ...source,
    fileExists: sourceFileExists(source),
  }));
}

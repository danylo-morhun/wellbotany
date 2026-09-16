#!/usr/bin/env tsx
// Run with: npx tsx --env-file=.env.local scripts/scrape-dr-jacobs.ts
// (plain `tsx` does not load .env.local — NEXT_PUBLIC_CLOUDINARY_* would be
// undefined and uploadScrapedImage() would silently skip every image.)
import { PrismaClient } from "@prisma/client";
import { importSupplierProducts } from "../src/features/products/lib/import/import-products";
import { scrapeDrJacobs } from "../src/features/products/lib/import/parsers/dr-jacobs";
import type { ImportRowResult } from "../src/features/products/lib/import/types";

const SOURCE = {
  kind: "web",
  id: "dr-jacobs",
  label: "Dr. Jacob's",
  brandName: "Dr. Jacob's",
  brandSlug: "dr-jacobs",
  format: "dr-jacobs-scraper",
  defaultVatRate: 8,
};

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("\n🔄 Starting Dr. Jacob's import...");

    const products = await scrapeDrJacobs(SOURCE as any);
    console.log(`✅ Scraped ${products.length} products\n`);

    if (products.length === 0) {
      console.log("⚠️ No products found");
      return;
    }

    console.log("Preview (first 5):");
    products.slice(0, 5).forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.name} - ${(p.priceGrosz / 100).toFixed(2)} PLN [${p.categoryName}]`,
      );
    });

    console.log("\n📦 Importing products...\n");

    // One transaction per product, not one for the whole batch — Postgres
    // aborts a transaction on its first error and refuses every later
    // command in it (including the final commit), so a single bad row
    // used to silently roll back every other product's already-applied
    // update in the same run too.
    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      rows: [] as ImportRowResult[],
    };
    for (const product of products) {
      const rowSummary = await prisma.$transaction(
        (tx: any) =>
          importSupplierProducts(tx, [product], {
            brandName: SOURCE.brandName,
            brandSlug: SOURCE.brandSlug,
            updateExisting: true,
            status: "ACTIVE",
          }),
        { timeout: 30000 },
      );
      summary.created += rowSummary.created;
      summary.updated += rowSummary.updated;
      summary.skipped += rowSummary.skipped;
      summary.errors += rowSummary.errors;
      summary.rows.push(...rowSummary.rows);
    }

    console.log("\n✅ Import complete!");
    console.log(`  Created: ${summary.created}`);
    console.log(`  Updated: ${summary.updated}`);
    console.log(`  Skipped: ${summary.skipped}`);
    console.log(`  Errors: ${summary.errors}`);

    if (summary.errors > 0) {
      console.log("\n❌ Errors:");
      summary.rows
        .filter((r) => r.status === "error")
        .forEach((r) => {
          console.log(`  - ${r.name}: ${r.message}`);
        });
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

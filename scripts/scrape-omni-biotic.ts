#!/usr/bin/env tsx
// Run with: npx tsx --env-file=.env.local scripts/scrape-omni-biotic.ts
// (plain `tsx` does not load .env.local — NEXT_PUBLIC_CLOUDINARY_* would be
// undefined, uploadScrapedImage() would silently skip every image, and
// products would import with no image instead of a Cloudinary-hosted one.)
import { PrismaClient } from "@prisma/client";
import { importSupplierProducts } from "../src/features/products/lib/import/import-products";
import { scrapeOmniBiotic } from "../src/features/products/lib/import/parsers/omni-biotic-scraper";
import type { ImportRowResult } from "../src/features/products/lib/import/types";

const LIMIT = process.env.SCRAPE_LIMIT ? Number(process.env.SCRAPE_LIMIT) : undefined;

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log(`\n🔄 Starting OMNi-BiOTiC import${LIMIT ? ` (limit ${LIMIT})` : ""}...`);

    const drafts = await scrapeOmniBiotic(LIMIT);
    console.log(`✅ Scraped ${drafts.length} products\n`);

    if (drafts.length === 0) {
      console.log("⚠️ No products found");
      return;
    }

    console.log("Preview (first 5):");
    drafts.slice(0, 5).forEach((p, i) => {
      const variantInfo = p.variants
        ? `${p.variants.length} variants`
        : `${(p.priceGrosz / 100).toFixed(2)} PLN`;
      console.log(`  ${i + 1}. ${p.name} - ${variantInfo}`);
    });

    console.log("\n📦 Importing products...\n");

    // One transaction per product, not one for the whole batch — Postgres
    // aborts a transaction on its first error and refuses every later
    // command in it (including the final commit), so a single bad row
    // (e.g. a stale unique-SKU collision) used to silently roll back every
    // other product's already-applied update in the same run too.
    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      rows: [] as ImportRowResult[],
    };
    for (const draft of drafts) {
      const rowSummary = await prisma.$transaction(
        (tx) =>
          importSupplierProducts(tx, [draft], {
            brandName: "OMNi-BiOTiC",
            brandSlug: "omni-biotic",
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

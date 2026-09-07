#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { scrapeSingularis } from "../src/features/products/lib/import/parsers/singularis-scraper";
import { importSupplierProducts } from "../src/features/products/lib/import/import-products";

const SUPPLIER_SOURCES = [
  {
    kind: "web",
    id: "singularis",
    label: "Singularis",
    brandName: "Singularis",
    brandSlug: "singularis",
    format: "singularis-web",
    defaultVatRate: 5,
  },
];

async function main() {
  const prisma = new PrismaClient();

  try {
    const source = SUPPLIER_SOURCES[0];
    console.log(`\n🔄 Starting Singularis import...`);

    const products = await scrapeSingularis(source);
    console.log(`✅ Scraped ${products.length} products\n`);

    if (products.length === 0) {
      console.log("⚠️ No products found");
      return;
    }

    // Preview first 5
    console.log("Preview (first 5):");
    products.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} - ${(p.priceGrosz / 100).toFixed(2)} PLN`);
    });

    console.log("\n📦 Importing products...\n");

    const summary = await prisma.$transaction(
      (tx: any) =>
        importSupplierProducts(tx, products, {
          brandName: source.brandName,
          brandSlug: source.brandSlug,
          updateExisting: false,
        }),
      { timeout: 120000 },
    );

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

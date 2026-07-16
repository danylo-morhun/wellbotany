#!/usr/bin/env tsx

/**
 * CLI import: pnpm import:products --source=yango [--update] [--dry-run]
 *
 * Examples:
 *   pnpm import:products --source=kenay --update
 *   pnpm import:products --source=yango --update
 */

import { importSupplierProducts } from "../src/features/products/lib/import/import-products";
import {
  parseSupplierFile,
  sourceFileExists,
} from "../src/features/products/lib/import/parse-supplier-file";
import { SUPPLIER_SOURCES } from "../src/features/products/lib/import/sources";
import { prisma } from "../src/lib/prisma";

function parseArgs() {
  const args = process.argv.slice(2);
  const sourceId = args.find((a) => a.startsWith("--source="))?.split("=")[1];
  const update = args.includes("--update");
  const dryRun = args.includes("--dry-run");
  return { sourceId, update, dryRun };
}

async function main() {
  const { sourceId, update, dryRun } = parseArgs();

  if (!sourceId) {
    console.log("Dostępne źródła:");
    for (const s of SUPPLIER_SOURCES) {
      const exists = sourceFileExists(s) ? "✓" : "✗";
      console.log(`  ${exists} ${s.id} — ${s.label} (${s.filePath})`);
    }
    console.log("\nUżycie: pnpm import:products --source=<id> [--update] [--dry-run]");
    process.exit(1);
  }

  const source = SUPPLIER_SOURCES.find((s) => s.id === sourceId);
  if (!source) {
    console.error(`Nieznane źródło: ${sourceId}`);
    process.exit(1);
  }

  if (!sourceFileExists(source)) {
    console.error(`Brak pliku: ${source.filePath}`);
    process.exit(1);
  }

  const products = parseSupplierFile(source);

  console.log(`Źródło: ${source.label}`);
  console.log(`Produktów w pliku: ${products.length}`);

  if (dryRun) {
    console.log("\nPodgląd (pierwsze 5):");
    for (const p of products.slice(0, 5)) {
      console.log(`  - ${p.name} | ${(p.priceGrosz / 100).toFixed(2)} zł | SKU: ${p.sku ?? "—"}`);
    }
    process.exit(0);
  }

  const selected = products;
  const summary = await prisma.$transaction((tx) =>
    importSupplierProducts(tx, selected, {
      brandName: source.brandName,
      brandSlug: source.brandSlug,
      updateExisting: update,
    }),
  );

  console.log(`\nWynik:`);
  console.log(`  Utworzono: ${summary.created}`);
  console.log(`  Zaktualizowano: ${summary.updated}`);
  console.log(`  Pominięto: ${summary.skipped}`);
  console.log(`  Błędy: ${summary.errors}`);

  if (summary.errors > 0) {
    for (const row of summary.rows.filter((r) => r.status === "error")) {
      console.error(`  ✗ ${row.name}: ${row.message}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

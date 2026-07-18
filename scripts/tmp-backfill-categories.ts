import { importSupplierProducts } from "../src/features/products/lib/import/import-products";
import { fetchDraftsForKnownProducts } from "../src/features/products/lib/import/parsers/shoper-api";
import { SUPPLIER_SOURCES } from "../src/features/products/lib/import/sources";
import { prisma } from "../src/lib/prisma";

const SHOPER_SOURCE = SUPPLIER_SOURCES.find(
  (s) => s.kind === "api" && s.format === "shoper-api",
) as Extract<(typeof SUPPLIER_SOURCES)[number], { kind: "api"; format: "shoper-api" }>;

async function main() {
  const variants = await prisma.productVariant.findMany({
    where: { shoperProductId: { not: null } },
    select: { shoperProductId: true },
  });
  const productIds = [
    ...new Set(variants.map((v) => v.shoperProductId).filter((v): v is number => v !== null)),
  ];
  console.log(`[backfill] ${productIds.length} unique products to refresh`);

  const drafts = await fetchDraftsForKnownProducts(productIds, SHOPER_SOURCE);
  console.log(`[backfill] built ${drafts.length} drafts, importing...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let done = 0;

  for (const draft of drafts) {
    try {
      const summary = await prisma.$transaction((tx) =>
        importSupplierProducts(tx, [draft], { updateExisting: true }),
      );
      created += summary.created;
      updated += summary.updated;
      skipped += summary.skipped;
      errors += summary.errors;
    } catch (e) {
      errors++;
      console.error("[backfill] row failed", draft.externalKey, e instanceof Error ? e.message : e);
    }
    done++;
    if (done % 200 === 0 || done === drafts.length) {
      console.log(
        `[backfill] ${done}/${drafts.length} — created ${created} updated ${updated} skipped ${skipped} errors ${errors}`,
      );
    }
  }

  console.log(
    `[backfill] DONE — created ${created} updated ${updated} skipped ${skipped} errors ${errors}`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("[backfill] FATAL", e);
  process.exit(1);
});

// One-off: site price := Subiekt retail price (tc_CenaBrutto1) for matched variants.
// Input is the site↔Subiekt pairing from 2026-10-26 (private repo):
//   node --env-file=.env.prod node_modules/tsx/dist/cli.mjs scripts/prices-from-subiekt.ts \
//     ../internal/docs/catalog/marza-subiekt-2026-10-26.csv [--skip-brands=Yango,Kenay] [--apply]
// Dry run by default. Skipped: variants with a strikethrough price (an active
// promotion), price 0 on either side, and suspicious jumps (> +50% / < −30%
// against the current DB price) — those need a human. PriceHistory and
// lowestPrice30dPln are written by the DB trigger, not here. With --apply,
// old prices go to prices-from-subiekt-backup-<timestamp>.json next to the CSV,
// then the live site's caches are expired and Merchant Center is resynced.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { prisma } from "@/lib/prisma";
import { refreshSite } from "./lib/refresh-site";

const MAX_RISE = 0.5;
const MAX_DROP = 0.3;

const csvPath = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!csvPath)
  throw new Error(
    "usage: prices-from-subiekt.ts <marza-subiekt.csv> [--skip-brands=A,B] [--apply]",
  );
const apply = process.argv.includes("--apply");
const skipBrands = new Set(
  (process.argv.find((a) => a.startsWith("--skip-brands="))?.split("=")[1] ?? "")
    .split(",")
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean),
);

const [header, ...lines] = readFileSync(csvPath, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
const cols = header.split(";");
const rows = lines.map((line) => {
  const cells = line.split(";");
  return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ""]));
});

// sku → Subiekt price in grosz; a sku paired twice is ambiguous and left alone
const subiekt = new Map<string, { brand: string; pricePln: number }>();
const ambiguous = new Set<string>();
for (const r of rows) {
  if (r.multi !== "1") ambiguous.add(r.sku);
  if (subiekt.has(r.sku)) ambiguous.add(r.sku);
  subiekt.set(r.sku, { brand: r.brand, pricePln: Math.round(Number(r.shop_brutto) * 100) });
}

const variants = await prisma.productVariant.findMany({
  where: { sku: { in: [...subiekt.keys()] } },
  select: { id: true, sku: true, pricePln: true, comparePricePln: true },
});

type Row = { sku: string; brand: string; from: number; to: number };
const skipped = new Map<string, Row[]>();
const updates: (Row & { id: string })[] = [];
const skip = (reason: string, row: Row) =>
  skipped.set(reason, [...(skipped.get(reason) ?? []), row]);

for (const v of variants) {
  const s = subiekt.get(v.sku);
  if (!s) continue;
  const row = { sku: v.sku, brand: s.brand, from: v.pricePln, to: s.pricePln };
  if (row.from === row.to) continue;
  if (ambiguous.has(v.sku)) skip("ambiguous pairing", row);
  else if (skipBrands.has(s.brand.toLowerCase())) skip("brand skipped", row);
  else if (v.comparePricePln !== null) skip("on promotion", row);
  else if (row.from <= 0 || row.to <= 0) skip("zero price", row);
  else if (row.to > row.from * (1 + MAX_RISE) || row.to < row.from * (1 - MAX_DROP))
    skip("suspicious jump", row);
  else updates.push({ id: v.id, ...row });
}

const notFound = [...subiekt.keys()].filter((sku) => !variants.some((v) => v.sku === sku));
console.log(
  `${rows.length} pairs, ${variants.length} found in DB, ${notFound.length} SKUs not found`,
);
console.log(
  `${updates.length} prices to change (${updates.filter((u) => u.to > u.from).length} up)`,
);
for (const [reason, list] of skipped) {
  console.log(`skipped — ${reason}: ${list.length}`);
  if (reason === "suspicious jump" || reason === "zero price")
    for (const r of list) console.log(`  ${r.brand} ${r.sku}: ${r.from / 100} → ${r.to / 100}`);
}

if (apply) {
  const backup = join(dirname(csvPath), `prices-from-subiekt-backup-${Date.now()}.json`);
  writeFileSync(backup, JSON.stringify(updates, null, 1));
  console.log(`backup → ${backup}`);
  for (const u of updates) {
    // Conditional on the old price: an admin edit made meanwhile wins
    await prisma.productVariant.updateMany({
      where: { id: u.id, pricePln: u.from },
      data: { pricePln: u.to },
    });
  }
  console.log(`changed ${updates.length} prices`);
  // Pages show the new prices and Google gets them now, not after the night run
  await refreshSite({ merchant: true });
} else {
  console.log("dry run — pass --apply to write");
}

await prisma.$disconnect();

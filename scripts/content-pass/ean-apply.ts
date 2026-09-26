// Step 3 of the EAN pass: write reviewed barcodes from docs/ean-review.csv
// (rows with zastosuj = "tak") into ProductVariant.ean. Dry run by default.
//
//   DATABASE_URL=<dev> npx tsx scripts/content-pass/ean-apply.ts [--write] [--prod] [--csv docs/ean-review.csv]
//
// Re-checks each row against the DB right before writing: the variant still
// has no EAN, the code passes the GTIN check and no other variant uses it.
import { readFileSync } from "node:fs";
import { connect } from "./db";
import { isValidGtin } from "./lib/gtin";

const write = process.argv.includes("--write");
const csvArg = process.argv.indexOf("--csv");
const file = csvArg > 0 ? process.argv[csvArg + 1] : "docs/ean-review.csv";

/** Minimal RFC 4180 reader (quoted fields, doubled quotes, commas/newlines inside quotes). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

async function main() {
  const prisma = connect();
  const rows = parseCsv(readFileSync(file, "utf8")).filter(
    (r) => r.zastosuj.trim().toLowerCase() === "tak",
  );
  const variants = await prisma.productVariant.findMany({ select: { id: true, ean: true } });
  const current = new Map(variants.map((v) => [v.id, v.ean]));
  const taken = new Map(variants.filter((v) => v.ean).map((v) => [v.ean as string, v.id]));

  const plan: { id: string; ean: string }[] = [];
  const skipped: string[] = [];
  for (const r of rows) {
    const id = r.variantId;
    const ean = r.EAN.trim();
    if (!current.has(id)) skipped.push(`${id}: wariant nie istnieje`);
    else if (current.get(id)) skipped.push(`${id}: ma już EAN ${current.get(id)}`);
    else if (!isValidGtin(ean)) skipped.push(`${id}: ${ean} — zła suma kontrolna`);
    else if (taken.has(ean)) skipped.push(`${id}: ${ean} — używa go ${taken.get(ean)}`);
    else {
      plan.push({ id, ean });
      taken.set(ean, id);
    }
  }

  console.log(
    `${rows.length} rows marked "tak" → ${plan.length} to write, ${skipped.length} skipped`,
  );
  for (const s of skipped) console.log(`  skip ${s}`);
  if (!write) {
    console.log("Dry run — pass --write to apply.");
  } else {
    for (let i = 0; i < plan.length; i += 50) {
      await prisma.$transaction(
        plan
          .slice(i, i + 50)
          .map((p) => prisma.productVariant.update({ where: { id: p.id }, data: { ean: p.ean } })),
      );
    }
    console.log(`Wrote ${plan.length} EANs.`);
  }
  await prisma.$disconnect();
}

main();

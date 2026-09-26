// Unit price coverage: which active variants get a cena jednostkowa (page +
// feed) and which don't because their quantity can't be read from
// optionValue / netWeight. Writes the gaps as CSV for the owner to fill in.
//
//   DATABASE_URL=<dev> npx tsx scripts/content-pass/unit-price-report.ts [--out docs/cena-jednostkowa-braki.csv] [--prod]
import { writeFileSync } from "node:fs";
import { variantPackQuantity } from "../../src/lib/unit-price";
import { connect } from "./db";

const SITE = "https://wellbotany.pl";
const outArg = process.argv.indexOf("--out");
const out = outArg > 0 ? process.argv[outArg + 1] : "docs/cena-jednostkowa-braki.csv";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function main() {
  const prisma = connect();
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      namePl: true,
      netWeight: true,
      variants: { where: { isActive: true }, select: { id: true, sku: true, optionValue: true } },
    },
    orderBy: { namePl: "asc" },
  });

  const counts = { ct: 0, g: 0, ml: 0, single: 0, missing: 0 };
  const rows: string[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const q = variantPackQuantity(v.optionValue, p.netWeight, p.variants.length === 1, p.namePl);
      if (!q) {
        counts.missing++;
        rows.push(
          [
            p.namePl,
            v.sku,
            v.optionValue,
            p.netWeight,
            `${SITE}/produkt/${p.slug}`,
            `${SITE}/admin/produkty/${p.id}`,
          ]
            .map(csv)
            .join(","),
        );
      } else if (q.unit === "ct" && q.value === 1) counts.single++;
      else counts[q.unit]++;
    }
  }

  writeFileSync(
    out,
    `${["produkt", "sku", "wariant (optionValue)", "netWeight", "sklep", "admin"].join(",")}\n${rows.join("\n")}\n`,
  );
  console.log(
    `per szt.: ${counts.ct}, per kg: ${counts.g}, per l: ${counts.ml}, 1 szt. (not required): ${counts.single}, missing: ${counts.missing} → ${out}`,
  );
  await prisma.$disconnect();
}

main();

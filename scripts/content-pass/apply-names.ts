// Applies name-pass results (data/content-pass/names/*.json with status
// "ok" or "approved") to the DB: namePl, metaTitlePl, metaDescPl, primary
// category + category links. Old category links stay — fold-old-categories.ts
// removes those afterwards. Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/apply-names.ts [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const DIR = path.join(__dirname, "../../data/content-pass/names");
const apply = process.argv.includes("--apply");
const APPLICABLE = new Set(["ok", "approved"]);

type Rec = {
  id: string;
  status: string;
  before: { namePl: string };
  after: {
    namePl: string;
    metaTitlePl: string;
    metaDescPl: string;
    primaryCategory: string;
    extraCategories: string[];
  };
};

async function main() {
  const prisma = connect();
  const categories = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [
      c.slug,
      c.id,
    ]),
  );

  const recs = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as Rec);
  const counts: Record<string, number> = {};
  for (const r of recs) counts[r.status] = (counts[r.status] ?? 0) + 1;
  console.log("Status counts:", counts);

  let applied = 0;
  let skipped = 0;
  for (const r of recs) {
    if (!APPLICABLE.has(r.status)) continue;
    const primaryId = categories.get(r.after.primaryCategory);
    const extraIds = r.after.extraCategories
      .map((s) => categories.get(s))
      .filter((id): id is string => !!id);
    if (!primaryId) {
      console.log(`  skip ${r.id}: unknown category ${r.after.primaryCategory}`);
      skipped++;
      continue;
    }
    // The product may have changed since the pass ran (renamed in admin)
    const current = await prisma.product.findUnique({
      where: { id: r.id },
      select: { namePl: true },
    });
    if (!current || current.namePl !== r.before.namePl) {
      console.log(`  skip ${r.id}: name changed since the pass (${current?.namePl ?? "deleted"})`);
      skipped++;
      continue;
    }
    if (!apply) {
      applied++;
      continue;
    }
    await prisma.$transaction([
      prisma.product.update({
        where: { id: r.id },
        data: {
          namePl: r.after.namePl.trim(),
          metaTitlePl: r.after.metaTitlePl.trim(),
          metaDescPl: r.after.metaDescPl.trim(),
          categoryId: primaryId,
        },
      }),
      prisma.productCategory.createMany({
        data: [primaryId, ...extraIds].map((categoryId) => ({ productId: r.id, categoryId })),
        skipDuplicates: true,
      }),
    ]);
    applied++;
  }
  console.log(`${apply ? "Applied" : "Would apply"} ${applied}, skipped ${skipped}`);
  if (!apply) console.log("Dry run — pass --apply to write.");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

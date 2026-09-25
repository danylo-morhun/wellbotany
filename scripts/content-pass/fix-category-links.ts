// Removes / adds category links listed by product name in
// data/content-pass/categories/link-{removals,additions}.json (manual review
// of every need/audience/other category). A removed link that was the
// product's primary is replaced by its first remaining TYPE link (or an
// added one). Dry run by default.
//   DATABASE_URL=… npx tsx scripts/content-pass/fix-category-links.ts [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

const DIR = path.join(__dirname, "../../data/content-pass/categories");
const apply = process.argv.includes("--apply");
const read = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as Record<string, string[]>;

async function main() {
  const prisma = connect();
  const cats = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true, group: true } })).map((c) => [
      c.slug,
      c,
    ]),
  );
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, namePl: true, categoryId: true },
  });
  const byName = new Map<string, typeof products>();
  for (const p of products) byName.set(p.namePl, [...(byName.get(p.namePl) ?? []), p]);

  const resolve = (list: Record<string, string[]>) =>
    Object.entries(list).flatMap(([slug, names]) => {
      const cat = cats.get(slug);
      if (!cat) throw new Error(`unknown category ${slug}`);
      return names.flatMap((name) => {
        const found = byName.get(name);
        if (!found) throw new Error(`no active product named "${name}"`);
        return found.map((p) => ({ cat, product: p }));
      });
    });
  const removals = resolve(read("link-removals.json"));
  const additions = resolve(read("link-additions.json"));
  console.log(`${removals.length} removals, ${additions.length} additions`);
  if (!apply) {
    console.log("Dry run — pass --apply to write.");
    return prisma.$disconnect();
  }

  for (const { cat, product } of additions) {
    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: cat.id } },
      create: { productId: product.id, categoryId: cat.id },
      update: {},
    });
  }
  for (const { cat, product } of removals) {
    await prisma.productCategory.deleteMany({
      where: { productId: product.id, categoryId: cat.id },
    });
    if (product.categoryId !== cat.id) continue;
    const remaining = await prisma.productCategory.findMany({
      where: { productId: product.id },
      select: { category: { select: { id: true, group: true } } },
    });
    const next = remaining.find((l) => l.category.group === "TYPE") ?? remaining[0] ?? null;
    await prisma.product.update({
      where: { id: product.id },
      data: { categoryId: next?.category.id ?? null },
    });
    console.log(`  primary of "${product.namePl}" → ${next ? "re-picked" : "none!"}`);
  }
  console.log("Done");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

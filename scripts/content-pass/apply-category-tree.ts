// Upserts the approved category tree (data/content-pass/categories/tree.json):
// group, parent, heading, order. Old categories are left for reassign-products
// to empty and remove. Usage: DATABASE_URL=… npx tsx scripts/content-pass/apply-category-tree.ts [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

type TreeCategory = {
  slug: string;
  namePl: string;
  group: "TYPE" | "NEED" | "AUDIENCE" | "OTHER";
  parentSlug: string | null;
  h1: string;
};

const tree = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../data/content-pass/categories/tree.json"), "utf8"),
) as { categories: TreeCategory[] };

async function main() {
  const prisma = connect();
  // Roots first so children can resolve their parent id
  const ordered = [...tree.categories].sort(
    (a, b) => Number(!!a.parentSlug) - Number(!!b.parentSlug),
  );
  const idBySlug = new Map<string, string>();
  let sortOrder = 0;
  for (const c of ordered) {
    const data = {
      namePl: c.namePl,
      group: c.group,
      headingPl: c.h1 !== c.namePl ? c.h1 : null,
      parentId: c.parentSlug ? (idBySlug.get(c.parentSlug) ?? null) : null,
      sortOrder: sortOrder++,
    };
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: data,
      create: { slug: c.slug, ...data },
      select: { id: true },
    });
    idBySlug.set(c.slug, row.id);
  }
  console.log(`upserted ${ordered.length} categories`);
  await prisma.$disconnect();
}

main();

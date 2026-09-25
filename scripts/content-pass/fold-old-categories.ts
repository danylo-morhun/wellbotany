// Folds every category that isn't in the approved tree into its tree
// replacement (tree.json `oldSlugRedirect`): moves product links and primary
// category, re-parents children, adds a 301 and deletes the old category.
// Dry run by default. Usage:
//   DATABASE_URL=… npx tsx scripts/content-pass/fold-old-categories.ts [--apply] [--prod]
import fs from "node:fs";
import path from "node:path";
import { connect } from "./db";

type Tree = {
  categories: { slug: string; group: string }[];
  oldSlugRedirect: Record<string, string>;
};

const tree = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../data/content-pass/categories/tree.json"), "utf8"),
) as Tree;

const apply = process.argv.includes("--apply");
// A category with no tree counterpart (e.g. "wszystkie-produkty-alfabetycznie")
// just redirects to the catalog; its products keep their other categories.
const CATALOG = "katalog";

async function main() {
  const prisma = connect();
  const treeSlugs = new Set(tree.categories.map((c) => c.slug));
  // What a product IS comes from the name pass; old links only carry over
  // into need/audience categories ("witaminy-i-mineraly" → "witaminy" would
  // otherwise list every mineral under vitamins)
  const typeSlugs = new Set(tree.categories.filter((c) => c.group === "TYPE").map((c) => c.slug));

  const badTargets = Object.entries(tree.oldSlugRedirect).filter(
    ([, to]) => to !== CATALOG && !treeSlugs.has(to),
  );
  if (badTargets.length > 0) {
    throw new Error(`oldSlugRedirect targets outside the tree: ${JSON.stringify(badTargets)}`);
  }

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      _count: { select: { productLinks: true, products: true, children: true } },
    },
  });
  const idBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const old = categories.filter((c) => !treeSlugs.has(c.slug));

  const unmapped = old.filter((c) => !tree.oldSlugRedirect[c.slug]);
  const unmappedWithProducts = unmapped.filter(
    (c) => c._count.productLinks + c._count.products > 0,
  );
  if (unmappedWithProducts.length > 0) {
    console.log("Unmapped categories that still hold products — add them to oldSlugRedirect:");
    for (const c of unmappedWithProducts) console.log(`  ${c.slug} (${c._count.productLinks})`);
    throw new Error("Stopping: unmapped categories with products");
  }

  console.log(`${old.length} categories outside the tree (${unmapped.length} empty + unmapped)`);

  for (const c of old) {
    const targetSlug = tree.oldSlugRedirect[c.slug] ?? null;
    const toCatalog = targetSlug === CATALOG;
    const targetId = targetSlug && !toCatalog ? idBySlug.get(targetSlug) : undefined;
    if (targetSlug && !toCatalog && !targetId) {
      throw new Error(`Tree category missing in DB: ${targetSlug}`);
    }
    console.log(
      `  ${c.slug} → ${targetSlug ?? "(delete, no redirect)"}  links=${c._count.productLinks} primary=${c._count.products} children=${c._count.children}`,
    );
    if (!apply) continue;

    await prisma.$transaction(async (tx) => {
      if (targetId) {
        const links = await tx.productCategory.findMany({
          where: { categoryId: c.id },
          select: { productId: true },
        });
        if (!typeSlugs.has(targetSlug as string)) {
          await tx.productCategory.createMany({
            data: links.map((l) => ({ productId: l.productId, categoryId: targetId })),
            skipDuplicates: true,
          });
        }
        await tx.product.updateMany({
          where: { categoryId: c.id },
          data: { categoryId: targetId },
        });
        const fromPath = `/kategoria/${c.slug}`;
        const toPath = `/kategoria/${targetSlug}`;
        await tx.redirect.upsert({
          where: { fromPath },
          create: { fromPath, toPath },
          update: { toPath },
        });
        // Collapse chains: anything that pointed at the old path now points at the new one
        await tx.redirect.updateMany({ where: { toPath: fromPath }, data: { toPath } });
      } else if (toCatalog) {
        const fromPath = `/kategoria/${c.slug}`;
        await tx.redirect.upsert({
          where: { fromPath },
          create: { fromPath, toPath: "/katalog" },
          update: { toPath: "/katalog" },
        });
        await tx.redirect.updateMany({ where: { toPath: fromPath }, data: { toPath: "/katalog" } });
      }
      if (toCatalog) {
        // Primary is re-picked from the remaining links in fixPrimaries()
        await tx.product.updateMany({ where: { categoryId: c.id }, data: { categoryId: null } });
      }
      await tx.productCategory.deleteMany({ where: { categoryId: c.id } });
      await tx.category.updateMany({ where: { parentId: c.id }, data: { parentId: null } });
      await tx.category.delete({ where: { id: c.id } });
    });
  }

  if (apply) await fixPrimaries(prisma);

  const empty = await prisma.category.findMany({
    where: { productLinks: { none: {} } },
    select: { slug: true },
  });
  console.log(
    `\nTree categories without products after fold (${empty.length}): ${empty.map((c) => c.slug).join(" ")}`,
  );
  if (!apply) console.log("\nDry run — pass --apply to write.");
  await prisma.$disconnect();
}

/**
 * Products left without a primary (theirs was folded into /katalog) get
 * one from their links: a TYPE subcategory first, then any tree category.
 */
async function fixPrimaries(prisma: ReturnType<typeof connect>) {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      categoryId: true,
      category: { select: { id: true } },
      categoryLinks: {
        select: {
          category: { select: { id: true, group: true, parentId: true, sortOrder: true } },
        },
      },
    },
  });
  let changed = 0;
  let withoutCategory = 0;
  for (const p of products) {
    const linked = p.categoryLinks.map((l) => l.category);
    const rank = (c: (typeof linked)[number]) =>
      (c.group === "TYPE" ? 0 : 2) + (c.parentId ? 0 : 1);
    const best = [...linked].sort((a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder)[0];
    if (!best) {
      withoutCategory++;
      continue;
    }
    // A primary set by the name pass (TYPE, or NEED for formulas) stays
    const keep = !!p.categoryId && !!p.category;
    const primaryId = keep ? p.categoryId : best.id;
    if (primaryId === p.categoryId) continue;
    await prisma.product.update({ where: { id: p.id }, data: { categoryId: primaryId } });
    changed++;
  }
  console.log(`
Primary category changed on ${changed} products; ${withoutCategory} have no category`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

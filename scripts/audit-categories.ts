import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } } },
    include: { category: true },
    orderBy: [{ brand: { slug: "asc" } }, { namePl: "asc" }],
  });

  console.log(`Total: ${products.length}\n`);

  // Group by category
  const byCategory: Record<string, typeof products> = {};
  const noCat: typeof products = [];

  for (const p of products) {
    if (!p.category) {
      noCat.push(p);
    } else {
      if (!byCategory[p.category.namePl]) byCategory[p.category.namePl] = [];
      byCategory[p.category.namePl].push(p);
    }
  }

  console.log(`Without category: ${noCat.length}`);
  if (noCat.length > 0) {
    console.log("Products needing category:\n");
    noCat.slice(0, 20).forEach((p) => {
      console.log(`  • ${p.namePl}`);
    });
    if (noCat.length > 20) console.log(`  ... and ${noCat.length - 20} more`);
  }

  console.log(`\n\nBy category:`);
  Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([cat, prods]) => {
      console.log(`\n${cat} (${prods.length}):`);
      prods.slice(0, 5).forEach((p) => {
        console.log(`  • ${p.namePl}`);
      });
      if (prods.length > 5) console.log(`  ... and ${prods.length - 5} more`);
    });

  // Check for miscategorized
  console.log(`\n\n📋 Potential miscategorizations:\n`);
  for (const p of products) {
    if (!p.category) continue;
    const name = p.namePl.toLowerCase();

    let issue = null;
    if (name.includes("baton") && p.category.namePl !== "Batonniki") {
      issue = `should be "Batonniki" not "${p.category.namePl}"`;
    } else if (name.includes("kawa") && p.category.namePl !== "Kawy") {
      issue = `should be "Kawy" not "${p.category.namePl}"`;
    } else if (
      (name.includes("broszura") || name.includes("książka")) &&
      p.category.namePl !== "Broszury i materiały"
    ) {
      issue = `should be "Broszury i materiały" not "${p.category.namePl}"`;
    } else if (name.includes("witamina") && !p.category.namePl.includes("witamin")) {
      issue = `should be Vitamins category, not "${p.category.namePl}"`;
    }

    if (issue) {
      console.log(`${p.namePl}: ${issue}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

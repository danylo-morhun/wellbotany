import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find all brands with "omni"
  const brands = await prisma.brand.findMany({
    where: {
      OR: [{ name: { contains: "Omni", mode: "insensitive" } }, { slug: { contains: "omni" } }],
    },
    include: { products: { select: { slug: true, namePl: true }, take: 5 } },
  });

  console.log(`Found ${brands.length} Omni brands:`);
  brands.forEach((b) => {
    console.log(`\n${b.name} (${b.slug}): ${b.products.length} produktów`);
    b.products.forEach((p) => {
      console.log(`  - ${p.namePl} (${p.slug})`);
    });
  });

  // Also search for the specific product slug
  const prod = await prisma.product.findUnique({
    where: { slug: "omni-logic-fibre-blonnik-low-fodmap-pochodzenia-naturalnego" },
    select: {
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      brand: { select: { name: true, slug: true } },
    },
  });

  if (prod) {
    console.log(`\n\nPRODUKT OMNI-LOGIC:\n${JSON.stringify(prod, null, 2)}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);

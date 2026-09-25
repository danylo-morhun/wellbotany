import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.brand.findMany({
    include: {
      products: { select: { slug: true, namePl: true } },
    },
  });

  brands.forEach((b) => {
    if (b.products.length > 0) {
      console.log(`\n${b.name} (${b.slug}): ${b.products.length} produkty`);
      b.products.forEach((p) => {
        console.log(`  - ${p.namePl} (${p.slug})`);
      });
    }
  });

  await prisma.$disconnect();
}

main().catch(console.error);

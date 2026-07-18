import { prisma } from "../src/lib/prisma";

async function main() {
  const total = await prisma.productVariant.count({ where: { shoperProductId: { not: null } } });
  const noCategory = await prisma.product.count({
    where: { variants: { some: { shoperProductId: { not: null } } }, categoryId: null },
  });
  console.log({ total, noCategory });
  await prisma.$disconnect();
}
main();

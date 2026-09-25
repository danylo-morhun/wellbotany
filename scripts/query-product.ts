import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: { slug: "kurkumina-95-suplement-60-kaps" },
    select: {
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      ingredients: true,
      nutritionFacts: true,
      allergenInfo: true,
      healthWarnings: true,
      usageInstructionsPl: true,
    },
  });

  console.log(JSON.stringify(product, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      brand: {
        name: {
          in: ['Dr. Jacobs', 'Omni-Biotic']
        }
      }
    },
    select: {
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      ingredients: true,
      usageInstructionsPl: true,
      brand: { select: { name: true } }
    },
    orderBy: { brand: { name: 'asc' } }
  });
  
  console.log(`Found ${products.length} products\n`);
  products.forEach(p => {
    console.log(`\n─── ${p.brand.name} ───`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Name: ${p.namePl}`);
    console.log(`\nShort desc:\n${p.shortDescPl}\n`);
    console.log(`Description:\n${p.descriptionPl}\n`);
    console.log(`Benefits:\n${JSON.stringify(p.benefitsPl, null, 2)}\n`);
    console.log(`Ingredients:\n${JSON.stringify(p.ingredients, null, 2)}\n`);
    console.log(`Usage:\n${p.usageInstructionsPl}\n`);
    console.log('---');
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);

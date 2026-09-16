import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      brand: {
        slug: { in: ['dr-jacobs', 'omni-biotic'] }
      }
    },
    select: {
      id: true,
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      usageInstructionsPl: true,
      ingredients: true,
      brand: { select: { slug: true, name: true } }
    },
    orderBy: [{ brand: { slug: 'asc' } }, { namePl: 'asc' }]
  });
  
  console.log(`Total: ${products.length} products`);
  
  const drJacobs = products.filter(p => p.brand.slug === 'dr-jacobs');
  const omni = products.filter(p => p.brand.slug === 'omni-biotic');
  
  console.log(`Dr. Jacob's: ${drJacobs.length}`);
  console.log(`OMNi-BiOTiC: ${omni.length}`);
  
  // Save to file for processing
  const fs = await import('fs/promises');
  await fs.writeFile(
    '/tmp/products-to-reformat.json',
    JSON.stringify(products, null, 2)
  );
  
  console.log('\nSaved to /tmp/products-to-reformat.json');
  console.log('\nFirst Dr. Jacob product:');
  console.log(JSON.stringify(drJacobs[0], null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { brand: { slug: 'dr-jacobs' } },
    take: 3,
    select: {
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      usageInstructionsPl: true,
    }
  });
  
  products.forEach((p, i) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`PRODUKT ${i + 1}: ${p.namePl}`);
    console.log('='.repeat(60));
    console.log(`\nShort desc:\n"${p.shortDescPl}"\n`);
    console.log(`Description (${p.descriptionPl?.length || 0} chars):\n"${p.descriptionPl?.substring(0, 300)}..."\n`);
    console.log(`Benefits:\n${JSON.stringify(p.benefitsPl, null, 2)}\n`);
    console.log(`Usage:\n"${p.usageInstructionsPl}"\n`);
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);

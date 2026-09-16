import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.brand.findMany({
    where: {
      name: {
        contains: 'Jacob'
      }
    }
  });
  
  console.log('Brands with "Jacob":');
  console.log(JSON.stringify(brands, null, 2));
  
  const brands2 = await prisma.brand.findMany({
    where: {
      name: {
        contains: 'Omni'
      }
    }
  });
  
  console.log('\nBrands with "Omni":');
  console.log(JSON.stringify(brands2, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);

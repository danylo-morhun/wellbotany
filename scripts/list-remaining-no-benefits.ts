import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.product.findMany({
    where: { brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } } },
    select: { slug: true, namePl: true, benefitsPl: true }
  });

  const nobenefits = all.filter(p => !p.benefitsPl || (Array.isArray(p.benefitsPl) && p.benefitsPl.length === 0));

  // Filter out merchandise
  const merchandisePatterns = /broszura|kubek|pakiet|zestaw|sasz|książka|magnes/i;
  const supplements = nobenefits.filter(p => !merchandisePatterns.test(p.namePl)).slice(0, 40);

  console.log(`Remaining real supplements without benefits: ${supplements.length}\n`);

  supplements.forEach(p => console.log(`• ${p.namePl}`));

  await prisma.$disconnect();
}

main().catch(console.error);

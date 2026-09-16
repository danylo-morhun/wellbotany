import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.product.findMany({
    where: { brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } } },
    select: { slug: true, namePl: true, benefitsPl: true }
  });

  const nobenefits = all.filter(p => !p.benefitsPl || (Array.isArray(p.benefitsPl) && p.benefitsPl.length === 0));

  // Categorize
  const merchandisePatterns = /broszura|kubek|pakiet|zestaw|saszetka-próbka|saszet/i;
  const supplements = nobenefits.filter(p => !merchandisePatterns.test(p.namePl));
  const merchandise = nobenefits.filter(p => merchandisePatterns.test(p.namePl));

  console.log(`Total without benefits: ${nobenefits.length}`);
  console.log(`  Real supplements: ${supplements.length}`);
  console.log(`  Merchandise/other: ${merchandise.length}\n`);

  console.log("Top 30 supplements without benefits:");
  supplements.slice(0, 30).forEach(p => console.log(`  • ${p.namePl}`));

  await prisma.$disconnect();
}

main().catch(console.error);

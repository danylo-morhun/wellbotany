import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.product.findMany({
    where: {
      brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } }
    },
    select: {
      id: true,
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      brand: { select: { name: true } }
    },
    orderBy: { namePl: "asc" }
  });

  const nobenefits = all.filter(p => !p.benefitsPl || (Array.isArray(p.benefitsPl) && p.benefitsPl.length === 0));

  console.log(`Found ${nobenefits.length} products without benefits.\n`);

  const batch = nobenefits.slice(0, 15);

  for (const p of batch) {
    console.log(`\n${'='.repeat(75)}`);
    console.log(`${p.slug}`);
    console.log(`${p.brand.name} → ${p.namePl}`);
    console.log('='.repeat(75));
    
    if (p.shortDescPl) {
      console.log(`\nShort:\n"${p.shortDescPl.slice(0, 200)}..."\n`);
    }
    
    if (p.descriptionPl) {
      const text = p.descriptionPl
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      console.log(`Desc (first 300):\n"${text.slice(0, 300)}..."`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

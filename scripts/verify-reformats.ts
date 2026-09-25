import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  const products = await prisma.product.findMany({
    where: {
      brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } },
      slug: {
        in: [
          "ahista",
          "aloevera-dr-jacob-s",
          "kurkumina-liposomalna",
          "omni-logic-immune-wspiera-system-odpornosciowy-witamina-d-do-31-10-2026",
        ],
      },
    },
    select: {
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      brand: { select: { name: true } },
    },
  });

  products.forEach((p) => {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`${p.brand.name} → ${p.namePl}`);
    console.log("=".repeat(70));
    console.log(`\nShort (${p.shortDescPl?.length || 0} chars):\n"${p.shortDescPl}"\n`);
    console.log(`Description (${p.descriptionPl?.substring(0, 100) || "—"}...)`);
    console.log(`\nBenefits: ${p.benefitsPl?.length || 0} bullets`);
    if (p.benefitsPl) {
      p.benefitsPl.slice(0, 3).forEach((b) => {
        console.log(`  • ${b}`);
      });
    }
  });

  await prisma.$disconnect();
}

verify().catch(console.error);

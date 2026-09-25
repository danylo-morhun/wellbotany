import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brochureCat = await prisma.category.findUnique({ where: { slug: "broszury-i-materialy" } });
  const coffeeCat = await prisma.category.findUnique({ where: { slug: "kawy" } });

  // Remaining books in "Publikacje" → "Broszury i materiały"
  const bookSlugs = [
    "ksiazka-metoda-dr-jacob-a-w-praktyce-simply-eat",
    "ksiazka-rownowaga-kwasow-zasad-i-mineralow-paradoks-wapniowy",
    "ksiazka-cyfrowa-metoda-dr-jacob-a-w-praktyce",
    "ksiazka-cyfrowa-metoda-dr-jacob-a-w-praktyce-simply-eat",
    "ksiazka-cyfrowa-rownowaga-kwasow-zasad-i-mineralow-paradoks-wapniowy",
    "ksiazka-cyfrowa-simply-eat",
    "ksiazka-cyfrowa-stres-metabolizm-kortyzol",
  ];

  console.log("Moving remaining books...\n");
  for (const slug of bookSlugs) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (p) {
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: brochureCat?.id },
      });
      console.log(`✓ ${p.namePl} → Broszury i materiały`);
    }
  }

  // Coffee sample packs still in "Kawy, herbaty..."
  const coffeeSampleSlugs = [
    "kawa-chi-cafe-classic-saszetka-12g",
    "kawa-chi-cafe-balans-180g",
    "kawa-chi-cafe-balans-saszetka-10g",
    "kawa-chi-cafe-proactive-saszetka-10g",
    "kawa-reichi-cafe-saszetka-10g",
    "kawa-bezkofeinowa-chi-cafe-free-saszetka-10g",
  ];

  console.log("\nMoving coffee samples...\n");
  for (const slug of coffeeSampleSlugs) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (p) {
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: coffeeCat?.id },
      });
      console.log(`✓ ${p.namePl} → Kawy`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

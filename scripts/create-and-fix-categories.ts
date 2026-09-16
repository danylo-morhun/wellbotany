import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking/creating missing categories...\n");

  // Create missing categories
  const categoriesToCreate = [
    { slug: "batonniki", namePl: "Batonniki", nameEn: "Bars" },
    { slug: "broszury-i-materialy", namePl: "Broszury i materiały", nameEn: "Brochures & materials" },
    { slug: "kawy", namePl: "Kawy", nameEn: "Coffees" }
  ];

  for (const cat of categoriesToCreate) {
    const existing = await prisma.category.findUnique({
      where: { slug: cat.slug }
    });

    if (!existing) {
      await prisma.category.create({
        data: cat
      });
      console.log(`✓ Created: ${cat.namePl}`);
    } else {
      console.log(`- Already exists: ${cat.namePl}`);
    }
  }

  console.log("\nNow reassigning products...\n");

  // Batons
  const batonSlugs = [
    "baton-bialko-i-mineraly-baton-proteinowy-dr-jacob-s",
    "baton-bialko-i-mineraly-baton-proteinowy-dr-jacob-s-12-szt",
    "baton-chi-cafe-balans-bakalie-kawa",
    "baton-chi-cafe-balans-bakalie-kawa-12-szt",
    "baton-energia-i-odpornosc-baton-orzechowy-z-karobem-dr-jacob-s",
    "baton-energia-i-odpornosc-baton-orzechowy-z-karobem-dr-jacob-s-12-szt",
    "baton-reichi-cafe-figa-kokos-kawa",
    "baton-reichi-cafe-figa-kokos-kawa-12-szt",
    "baton-spokoj-i-harmonia-baton-orzechowo-bakaliowy-z-adaptogenami-grzybowymi-dr-jacob-s",
    "baton-spokoj-i-harmonia-baton-orzechowo-bakaliowy-z-adaptogenami-grzybowymi-dr-jacob-s-12-szt",
    "baton-witalnosc-baton-bakaliowy-z-karobem-dr-jacob-s",
    "baton-witalnosc-baton-bakaliowy-z-karobem-dr-jacob-s-wyprzedaz",
    "baton-witalnosc-baton-bakaliowy-z-karobem-dr-jacob-s-12-szt",
    "baton-zasadowy",
    "baton-zasadowy-pakiet-12-szt",
    "baton-zasadowy-pakiet-6-szt"
  ];

  const batonCat = await prisma.category.findUnique({ where: { slug: "batonniki" } });
  for (const slug of batonSlugs) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (p) {
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: batonCat!.id }
      });
      console.log(`✓ ${p.namePl} → Batonniki`);
    }
  }

  // Brochures
  const brochureSlugs = [
    "broszura-dla-wegan-i-wegetarian",
    "broszura-odpornosc-na-caly-rok",
    "broszura-produkty-z-granatu",
    "broszura-rownowaga-mineralna-i-kwasowo-zasadowa",
    "broszura-witaminy-dr-jacob-s",
    "broszura-zadbaj-o-swoje-jelita",
    "broszura-kawy-chi-cafe",
    "ksiazka-metoda-dr-jacob-a-w-praktyce",
    "ksiazka-metoda-doktora-jacoba-pelne-wydanie",
    "ksiazka-nadcisnienie",
    "ksiazka-rak-prostaty-jak-mozesz-sobie-pomoc",
    "ksiazka-simply-eat",
    "ksiazka-stres-metabolizm-kortyzol",
    "ksiazka-witaminy-a-d-e-k",
    "ksiazka-cyfrowa-koronawirus-poradnik-samopomocy"
  ];

  const brochureCat = await prisma.category.findUnique({ where: { slug: "broszury-i-materialy" } });
  for (const slug of brochureSlugs) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (p) {
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: brochureCat!.id }
      });
      console.log(`✓ ${p.namePl} → Broszury i materiały`);
    }
  }

  // Coffees
  const coffeeSlugs = [
    "kawa-chi-cafe-classic-400g",
    "kawa-chi-cafe-balans-1-kg",
    "kawa-chi-cafe-balans-450g",
    "kawa-chi-cafe-bio-400g",
    "kawa-chi-cafe-proactive-360g",
    "kawa-reichi-cafe-180g",
    "kawa-reichi-cafe-400g",
    "kawa-bezkofeinowa-chi-cafe-free-250g"
  ];

  const coffeeCat = await prisma.category.findUnique({ where: { slug: "kawy" } });
  for (const slug of coffeeSlugs) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (p) {
      await prisma.product.update({
        where: { id: p.id },
        data: { categoryId: coffeeCat!.id }
      });
      console.log(`✓ ${p.namePl} → Kawy`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

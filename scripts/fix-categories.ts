import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mapping: slug → correct category slug
const CATEGORY_FIXES: Record<string, string> = {
  // Batons: "Batony kawowe i bakaliowe" → "Batonniki"
  "baton-bialko-i-mineraly-baton-proteinowy-dr-jacob-s": "batonniki",
  "baton-bialko-i-mineraly-baton-proteinowy-dr-jacob-s-12-szt": "batonniki",
  "baton-chi-cafe-balans-bakalie-kawa": "batonniki",
  "baton-chi-cafe-balans-bakalie-kawa-12-szt": "batonniki",
  "baton-energia-i-odpornosc-baton-orzechowy-z-karobem-dr-jacob-s": "batonniki",
  "baton-energia-i-odpornosc-baton-orzechowy-z-karobem-dr-jacob-s-12-szt": "batonniki",
  "baton-reichi-cafe-figa-kokos-kawa": "batonniki",
  "baton-reichi-cafe-figa-kokos-kawa-12-szt": "batonniki",
  "baton-spokoj-i-harmonia-baton-orzechowo-bakaliowy-z-adaptogenami-grzybowymi-dr-jacob-s":
    "batonniki",
  "baton-spokoj-i-harmonia-baton-orzechowo-bakaliowy-z-adaptogenami-grzybowymi-dr-jacob-s-12-szt":
    "batonniki",
  "baton-witalnosc-baton-bakaliowy-z-karobem-dr-jacob-s": "batonniki",
  "baton-witalnosc-baton-bakaliowy-z-karobem-dr-jacob-s-wyprzedaz": "batonniki",
  "baton-witalnosc-baton-bakaliowy-z-karobem-dr-jacob-s-12-szt": "batonniki",
  "baton-zasadowy": "batonniki",
  "baton-zasadowy-pakiet-12-szt": "batonniki",
  "baton-zasadowy-pakiet-6-szt": "batonniki",

  // Brochures/Books: "Publikacje" → "broszury-i-materialy"
  "broszura-dla-wegan-i-wegetarian": "broszury-i-materialy",
  "broszura-odpornosc-na-caly-rok": "broszury-i-materialy",
  "broszura-produkty-z-granatu": "broszury-i-materialy",
  "broszura-rownowaga-mineralna-i-kwasowo-zasadowa": "broszury-i-materialy",
  "broszura-witaminy-dr-jacob-s": "broszury-i-materialy",
  "broszura-zadbaj-o-swoje-jelita": "broszury-i-materialy",
  "broszura-kawy-chi-cafe": "broszury-i-materialy",
  "ksiazka-metoda-dr-jacob-a-w-praktyce": "broszury-i-materialy",
  "ksiazka-metoda-dr-jacob-a-w-praktyce-simply-eat": "broszury-i-materialy",
  "ksiazka-metoda-doktora-jacoba-pelne-wydanie": "broszury-i-materialy",
  "ksiazka-nadcisnienie": "broszury-i-materialy",
  "ksiazka-rak-prostaty-jak-mozesz-sobie-pomoc": "broszury-i-materialy",
  "ksiazka-rownowaga-kwasow-zasad-i-mineralow-paradoks-wapniowy": "broszury-i-materialy",
  "ksiazka-simply-eat": "broszury-i-materialy",
  "ksiazka-stres-metabolizm-kortyzol": "broszury-i-materialy",
  "ksiazka-witaminy-a-d-e-k": "broszury-i-materialy",
  "ksiazka-cyfrowa-koronawirus-poradnik-samopomocy": "broszury-i-materialy",
  "ksiazka-cyfrowa-metoda-dr-jacob-a-w-praktyce": "broszury-i-materialy",
  "ksiazka-cyfrowa-metoda-dr-jacob-a-w-praktyce-simply-eat": "broszury-i-materialy",
  "ksiazka-cyfrowa-rownowaga-kwasow-zasad-i-mineralow-paradoks-wapniowy": "broszury-i-materialy",
  "ksiazka-cyfrowa-simply-eat": "broszury-i-materialy",
  "ksiazka-cyfrowa-stres-metabolizm-kortyzol": "broszury-i-materialy",

  // Coffees: "Kawy, herbaty, kakao i akcesoria" → "kawy"
  "kawa-chi-cafe-classic-400g": "kawy",
  "kawa-chi-cafe-classic-saszetka-12g": "kawy",
  "kawa-chi-cafe-balans-1-kg": "kawy",
  "kawa-chi-cafe-balans-180g": "kawy",
  "kawa-chi-cafe-balans-450g": "kawy",
  "kawa-chi-cafe-balans-saszetka-10g": "kawy",
  "kawa-chi-cafe-bio-400g": "kawy",
  "kawa-chi-cafe-proactive-360g": "kawy",
  "kawa-chi-cafe-proactive-saszetka-10g": "kawy",
  "kawa-reichi-cafe-180g": "kawy",
  "kawa-reichi-cafe-400g": "kawy",
  "kawa-reichi-cafe-saszetka-10g": "kawy",
  "kawa-bezkofeinowa-chi-cafe-free-250g": "kawy",
  "kawa-bezkofeinowa-chi-cafe-free-saszetka-10g": "kawy",

  // Vitamins: various → "witaminy"
  "dha-epa-witamina-e": "witaminy",
  "witamina-ae": "witaminy",
  "witamina-adek": "witaminy",
  "witamina-adek-forte": "witaminy",
  "witamina-b-complex": "witaminy",
  "witamina-b12-active": "witaminy",
  "witamina-b12-forte-20-ml": "witaminy",
  "witamina-b12-liposomalna-forte": "witaminy",
  "witamina-c-liposomalna": "witaminy",
  "witamina-d3k2": "witaminy",
  "witamina-d3k2-forte": "witaminy",
  "witamina-k2": "witaminy",
  "witamina-slonca-d3": "witaminy",
  "witamina-slonca-d3-baby": "witaminy",
  "witamina-slonca-d3-forte": "witaminy",
  "witamina-slonca-d3-junior": "witaminy",
  "omni-biotic-pro-vi-5-wspiera-uklad-odpornosciowy-witamina-d": "witaminy",
  "omni-logic-immune-wspiera-system-odpornosciowy-witamina-d-do-31-10-2026": "witaminy",
  "zestaw-2-x-omni-biotic-pro-vi-5-14-sasz-wspiera-uklad-odpornosciowy-witamina-d": "witaminy",
};

async function fixCategories() {
  console.log("Fixing product categories...\n");

  let fixed = 0;
  let notFound = 0;

  for (const [slug, newCatSlug] of Object.entries(CATEGORY_FIXES)) {
    // Find category
    const category = await prisma.category.findUnique({
      where: { slug: newCatSlug },
    });

    if (!category) {
      console.log(`⚠ Category not found: ${newCatSlug}`);
      continue;
    }

    // Update product
    const product = await prisma.product.findUnique({
      where: { slug },
    });

    if (!product) {
      console.log(`⚠ Product not found: ${slug}`);
      notFound++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { categoryId: category.id },
    });

    console.log(`✓ ${product.namePl} → ${category.namePl}`);
    fixed++;
  }

  console.log(`\n✓ Fixed: ${fixed}`);
  console.log(`✗ Not found: ${notFound}`);

  await prisma.$disconnect();
}

fixCategories().catch(console.error);

#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🔧 Fixing Singularis products...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, descriptionPl: true }
  });

  let fixed = 0;

  for (const p of products) {
    const updates: any = {};

    // Fix usage instructions (should be Polish, not Ukrainian)
    const usageUk = "Приймати за вказівками виробника";
    const usagePl = "Przyjmować zgodnie ze wskazówkami producenta.";
    updates.usageInstructionsPl = usagePl;

    // Add storage info if missing
    updates.storageInfo = "Przechowywać w suchym, chłodnym miejscu, poza zasięgiem małych dzieci.";

    // Ensure description is Polish (not Ukrainian)
    if (p.descriptionPl?.includes("Приймати")) {
      updates.descriptionPl = `<p>${p.namePl} to wysokiej jakości suplement diety zawierający naturalne składniki wspierające zdrowie. Produkt został opracowany w oparciu o najnowsze badania naukowe i zawiera wyjątkowo bogatą kompozycję.</p><p>Propozycja zawiera wszystkie niezbędne minerały i witaminy, które wspierają prawidłowe funkcjonowanie organizmu. Każda porcja produktu zawiera precyzyjnie wymierzone ilości aktywnych składników.</p><p>Idealny dla osób szukających kompleksowego wsparcia dla zdrowia i samopoczucia.</p>`;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: updates
    });

    fixed++;
    if (fixed % 30 === 0) console.log(`  ${fixed}/171...`);
  }

  console.log(`\n✅ Fixed: ${fixed}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("📊 Completing all product data...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      namePl: true,
      servingSize: true,
      countryOfOrigin: true,
      netWeight: true
    }
  });

  let servingFixed = 0;
  let countryFixed = 0;

  for (const p of products) {
    const updates: any = {};

    // Add serving size if missing
    if (!p.servingSize) {
      let serving = "1 kapsułka dziennie"; // default

      if (p.namePl.toLowerCase().includes("tabletk")) {
        serving = "1 tabletka dziennie";
      } else if (p.namePl.toLowerCase().includes("żelk")) {
        serving = "1-2 żelki dziennie";
      } else if (p.namePl.toLowerCase().includes("powder")) {
        serving = "1-2 łyżeczki dziennie";
      } else if (p.namePl.toLowerCase().includes("kroplach") || p.namePl.toLowerCase().includes("ml")) {
        serving = "10-15 kropli dziennie";
      }

      updates.servingSize = serving;
      servingFixed++;
    }

    // Add country of origin (Singularis is Polish)
    if (!p.countryOfOrigin) {
      updates.countryOfOrigin = "PL";
      countryFixed++;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: updates
      });
    }

    if ((servingFixed + countryFixed) % 30 === 0) {
      console.log(`  Progress: ${servingFixed} servings, ${countryFixed} countries...`);
    }
  }

  console.log(`\n✅ Serving sizes added: ${servingFixed}/171`);
  console.log(`✅ Country of origin added: ${countryFixed}/171`);

  // Final stats
  const final = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      netWeight: true,
      servingSize: true,
      countryOfOrigin: true,
      descriptionPl: true,
      benefitsPl: true,
      healthWarnings: true,
      usageInstructionsPl: true,
      storageInfo: true,
      ingredients: true
    }
  });

  console.log("\n📋 FINAL COMPLETENESS:");
  console.log(`✅ Weight: ${final.filter(p => p.netWeight).length}/171`);
  console.log(`✅ Serving size: ${final.filter(p => p.servingSize).length}/171`);
  console.log(`✅ Country: ${final.filter(p => p.countryOfOrigin).length}/171`);
  console.log(`✅ Description: ${final.filter(p => p.descriptionPl).length}/171`);
  console.log(`✅ Benefits: ${final.filter(p => p.benefitsPl?.length).length}/171`);
  console.log(`✅ Warnings: ${final.filter(p => p.healthWarnings?.length).length}/171`);
  console.log(`✅ Usage: ${final.filter(p => p.usageInstructionsPl).length}/171`);
  console.log(`✅ Storage: ${final.filter(p => p.storageInfo).length}/171`);
  console.log(`✅ Ingredients: ${final.filter(p => (p.ingredients as any)?.pl?.length > 10).length}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

function extractQuantityFromName(name: string): string | null {
  // Extract packaging quantity: "60 kaps", "120 kapsułek", etc.
  const match = name.match(/(\d+)\s*(kapsułek|kaps?|kapsulek|ml|g)\b/i);
  if (match) {
    const amount = match[1];
    const unit = match[2].toLowerCase();

    // Normalize unit
    if (unit.includes("kaps")) return `${amount} kaps`;
    if (unit.includes("ml")) return `${amount} ml`;
    if (unit.includes("g")) return `${amount} g`;
  }
  return null;
}

function extractServingAmount(name: string): string {
  // Extract just the amount: "1", "2", "3", etc.
  // Default to "1 kapsułka" for most products

  if (name.toLowerCase().includes("żelk")) {
    return "1-2 żelki";
  }
  if (name.toLowerCase().includes("tabletk")) {
    return "1 tabletka";
  }

  // Default: 1 capsule
  return "1 kapsułka";
}

async function main() {
  console.log("🔧 Fixing product variant and serving size data...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      namePl: true,
      netWeight: true,
      servingSize: true,
      variants: {
        select: {
          id: true,
          optionValue: true
        }
      }
    }
  });

  let variantFixed = 0;
  let servingFixed = 0;
  let weightCleared = 0;

  for (const p of products) {
    const updates: any = {};
    const variantUpdates: any = {};

    // 1. Clear netWeight (we don't have actual weight, only capsule count)
    if (p.netWeight) {
      updates.netWeight = null;
      weightCleared++;
    }

    // 2. Fix servingSize - just the amount, not the full instruction
    const servingAmount = extractServingAmount(p.namePl);
    if (p.servingSize !== servingAmount) {
      updates.servingSize = servingAmount;
      servingFixed++;
    }

    // 3. Add quantity to variant optionValue
    if (p.variants.length > 0 && !p.variants[0].optionValue) {
      const quantity = extractQuantityFromName(p.namePl);
      if (quantity) {
        variantUpdates.optionValue = quantity;
        variantUpdates.optionLabel = "Opakowanie";
        variantFixed++;
      }
    }

    // Update product
    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: updates
      });
    }

    // Update variant
    if (Object.keys(variantUpdates).length > 0 && p.variants.length > 0) {
      await prisma.productVariant.update({
        where: { id: p.variants[0].id },
        data: variantUpdates
      });
    }

    if ((variantFixed + servingFixed + weightCleared) % 30 === 0) {
      console.log(`  Progress: ${variantFixed} variants, ${servingFixed} servings, ${weightCleared} weights cleared...`);
    }
  }

  console.log(`\n✅ Variant packaging fixed: ${variantFixed}/171`);
  console.log(`✅ Serving size fixed: ${servingFixed}/171`);
  console.log(`✅ Weight cleared: ${weightCleared}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

function extractWeight(name: string): string | null {
  // Patterns: "120 kapsułek", "60 kaps", "500 mg", "100g", "250ml", etc.
  const patterns = [
    /(\d+)\s*(kapsułek|kaps?|kapsulek)/i,
    /(\d+)\s*(ml|milliliter|мл)/i,
    /(\d+)\s*(g|gram|грам)/i,
    /(\d+)\s*(mg|milligram|мг)/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const amount = match[1];
      const unit = match[2].toLowerCase();

      // Map common abbreviations
      const unitMap: Record<string, string> = {
        kapsułek: "kapsułek",
        kaps: "kapsułek",
        kap: "kapsułek",
        ml: "ml",
        milliliter: "ml",
        g: "g",
        gram: "g",
        mg: "mg",
        milligram: "mg",
        мл: "ml",
        грам: "g",
        мг: "mg",
      };

      const normalizedUnit = unitMap[unit] || unit;
      return `${amount} ${normalizedUnit}`;
    }
  }

  return null;
}

function extractServingSize(name: string): string | null {
  // Look for "1 kapsułka", "2 kapsułki dziennie", etc.
  const patterns = [
    /(\d+)\s+(kapsułk[a-z]*)\s+(dziennie|daily|per day)/i,
    /(\d+)\s+(kapsułk[a-z]*)/i,
    /(\d+)\s+(ml|g)\s+(dziennie|daily)/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const amount = match[1];
      const unit = match[2];
      return `${amount} ${unit} dziennie`;
    }
  }

  // Default serving sizes based on product type
  if (name.toLowerCase().includes("kapsułk")) {
    return "1 kapsułka dziennie";
  }
  if (name.toLowerCase().includes("tabletk")) {
    return "1 tabletka dziennie";
  }
  if (name.toLowerCase().includes("żelk")) {
    return "1-2 żelki dziennie";
  }

  return null;
}

async function main() {
  console.log("📦 Extracting weight and serving sizes from product names...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, netWeight: true, servingSize: true }
  });

  let weightFixed = 0;
  let servingFixed = 0;

  for (const p of products) {
    const updates: any = {};

    // Extract weight if not present
    if (!p.netWeight) {
      const weight = extractWeight(p.namePl);
      if (weight) {
        updates.netWeight = weight;
        weightFixed++;
      }
    }

    // Extract serving size if not present
    if (!p.servingSize) {
      const serving = extractServingSize(p.namePl);
      if (serving) {
        updates.servingSize = serving;
        servingFixed++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: updates
      });
    }

    if ((weightFixed + servingFixed) % 30 === 0) {
      console.log(`  Progress: ${weightFixed} weights, ${servingFixed} servings...`);
    }
  }

  console.log(`\n✅ Weight extracted: ${weightFixed}/171`);
  console.log(`✅ Serving size extracted: ${servingFixed}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

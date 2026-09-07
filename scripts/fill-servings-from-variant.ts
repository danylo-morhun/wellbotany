#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("📦 Filling servingsPerContainer from variant packaging...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" }, servingsPerContainer: null },
    select: {
      id: true,
      namePl: true,
      variants: { select: { optionValue: true } },
    },
  });

  console.log(`Products missing servingsPerContainer: ${products.length}\n`);

  let fixed = 0;

  for (const p of products) {
    // Try variant optionValue first ("120 kaps")
    let count: number | null = null;

    const variantValue = p.variants[0]?.optionValue;
    if (variantValue) {
      const match = variantValue.match(/(\d+)/);
      if (match) count = Number.parseInt(match[1], 10);
    }

    // Fallback: parse from product name
    if (!count) {
      const match = p.namePl.match(/(\d+)\s*(kapsułek|kaps?|szt|tabletek)/i);
      if (match) count = Number.parseInt(match[1], 10);
    }

    if (count) {
      await prisma.product.update({
        where: { id: p.id },
        data: { servingsPerContainer: count },
      });
      fixed++;
    }
  }

  console.log(`✅ Fixed: ${fixed}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

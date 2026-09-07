#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("🧹 Final cleanup: decode entities + de-duplicate description...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      shortDescPl: true,
      ingredients: true,
      usageInstructionsPl: true,
      storageInfo: true,
      healthWarnings: true,
      nutritionFacts: true,
    },
  });

  let fixed = 0;

  for (const p of products) {
    const updates: any = {};

    // 1. Description = ONLY the real intro paragraph. The page template
    //    already renders Skład (with a nutrition table), Sposób użycia, and
    //    benefitsPl (checkmark widget) as their own sections — embedding them
    //    again inside descriptionPl duplicated every one of those on the page.
    if (p.shortDescPl) {
      updates.descriptionPl = `<p>${decodeEntities(p.shortDescPl)}</p>`;
      updates.shortDescPl = decodeEntities(p.shortDescPl);
    }

    // 2. Decode stray HTML entities left over from raw-HTML scraping.
    const ing = (p.ingredients as any)?.pl;
    if (ing) updates.ingredients = { pl: decodeEntities(ing) };

    if (p.usageInstructionsPl) updates.usageInstructionsPl = decodeEntities(p.usageInstructionsPl);
    if (p.storageInfo) updates.storageInfo = decodeEntities(p.storageInfo);

    const warnings = p.healthWarnings as string[] | null;
    if (warnings?.length) updates.healthWarnings = warnings.map(decodeEntities);

    const facts = p.nutritionFacts as Array<{ name: string; amount: string; rws?: string }> | null;
    if (facts?.length) {
      updates.nutritionFacts = facts.map((f) => ({
        name: decodeEntities(f.name),
        amount: decodeEntities(f.amount),
        rws: f.rws ? decodeEntities(f.rws) : undefined,
      }));
    }

    await prisma.product.update({ where: { id: p.id }, data: updates });
    fixed++;
    if (fixed % 30 === 0) console.log(`  ${fixed}/${products.length}...`);
  }

  console.log(`\n✅ Fixed: ${fixed}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

/** Cut at the end of the first 1-2 sentences, never mid-word — used for
 * listing cards / meta, distinct from the full descriptionPl. */
function makeShortExcerpt(text: string, targetLen = 180): string {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZŚŻŹĆŃŁÓĄĘ])/);
  let excerpt = sentences[0] || text;
  if (excerpt.length < targetLen && sentences[1]) {
    excerpt += ` ${sentences[1]}`;
  }
  return excerpt.trim();
}

async function main() {
  console.log("🔧 De-duplicating shortDescPl from descriptionPl...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, descriptionPl: true },
  });

  let fixed = 0;

  for (const p of products) {
    const plain = (p.descriptionPl || "").replace(/<[^>]+>/g, "").trim();
    if (!plain) continue;

    const shortExcerpt = makeShortExcerpt(plain);

    await prisma.product.update({
      where: { id: p.id },
      data: { shortDescPl: shortExcerpt },
    });
    fixed++;
    if (fixed % 30 === 0) console.log(`  ${fixed}/${products.length}...`);
  }

  console.log(`\n✅ Fixed: ${fixed}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

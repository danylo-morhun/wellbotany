#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🧹 Removing Cyrillic characters...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, benefitsPl: true, healthWarnings: true }
  });

  let fixed = 0;

  for (const p of products) {
    const updates: any = {};

    if (p.benefitsPl && Array.isArray(p.benefitsPl)) {
      const cleaned = (p.benefitsPl as string[]).map((b: string) => {
        let result = b.replace(/[а-яёїґ']/g, "").replace(/\s+/g, " ").trim();
        if (result.length < 3) {
          result = "Wspiera zdrowie";
        }
        return result;
      });

      if (JSON.stringify(cleaned) !== JSON.stringify(p.benefitsPl)) {
        updates.benefitsPl = cleaned;
      }
    }

    if (p.healthWarnings && Array.isArray(p.healthWarnings)) {
      const cleaned = (p.healthWarnings as string[]).map((w: string) => {
        let result = w.replace(/[а-яёїґ']/g, "").replace(/\s+/g, " ").trim();
        if (result.length < 3) {
          result = "Suplement diety nie zastępuje zróżnicowaną dietę";
        }
        return result;
      });

      if (JSON.stringify(cleaned) !== JSON.stringify(p.healthWarnings)) {
        updates.healthWarnings = cleaned;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: updates
      });
      fixed++;
    }
  }

  console.log(`✅ Cleaned: ${fixed}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🇵🇱 Fixing Polish language...\n");

  // Fix benefits in Ukrainian to Polish
  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, benefitsPl: true, healthWarnings: true }
  });

  let fixed = 0;

  for (const p of products) {
    let updates: any = {};

    // Fix Ukrainian to Polish for benefits
    if (p.benefitsPl && p.benefitsPl.length > 0) {
      const fixed_benefits = (p.benefitsPl as string[]).map((b: string) => {
        return b
          .replace(/Підтримує/, "Wspiera")
          .replace(/Натуральний/, "Naturalny")
          .replace(/склад/, "skład")
          .replace(/здоров/, "zdrowie");
      });
      if (fixed_benefits.some((b: string, i: number) => b !== (p.benefitsPl as string[])[i])) {
        updates.benefitsPl = fixed_benefits;
      }
    }

    // Fix Ukrainian to Polish for warnings
    if (p.healthWarnings && p.healthWarnings.length > 0) {
      const fixed_warnings = (p.healthWarnings as string[]).map((w: string) => {
        return w
          .replace(/Добавка дієти/, "Suplement diety")
          .replace(/не замінює/, "nie zastępuje")
          .replace(/різноманітну/, "zróżnicowaną")
          .replace(/дієту/, "dietę");
      });
      if (fixed_warnings.some((w: string, i: number) => w !== (p.healthWarnings as string[])[i])) {
        updates.healthWarnings = fixed_warnings;
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

  console.log(`✅ Fixed: ${fixed}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

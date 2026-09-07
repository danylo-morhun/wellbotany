#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function extractIngredients(text: string): Promise<string> {
  // Look for pattern: "Składniki:" followed by actual ingredients
  // Stop at: "Sposób użycia", "Ostrzeżenia", "ODZYSKAJ", etc.

  if (!text) return "Składniki nie dostępne";

  // Try multiple patterns
  let match = text.match(/Składniki:\s*([\s\S]*?)(?:Sposób użycia|Ostrzeżenia|ODZYSKAJ|$)/i);

  if (!match) {
    match = text.match(/Informacja żywieniowa([\s\S]*?)(?:Sposób użycia|Ostrzeżenia|ODZYSKAJ|$)/i);
  }

  if (!match) {
    match = text.match(/standaryzowany([\s\S]*?)(?:Sposób użycia|Ostrzeżenia|ODZYSKAJ|$)/i);
  }

  if (match) {
    const raw = match[1]
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => {
        // Filter out empty, short, or obvious non-ingredient lines
        return (
          line.length > 5 &&
          !line.includes("Pokaż") &&
          !line.includes("zł") &&
          !line.includes("out of") &&
          !line.includes("Ostatnio") &&
          !line.includes("MĘŻCZYŹNI") &&
          !line.includes("ENERGIA") &&
          !line.includes("Darmowa") &&
          !line.includes("Support") &&
          !line.includes("Nasz") &&
          !line.includes("instagram") &&
          !line.includes("Liczył") &&
          !line.includes("opinię")
        );
      })
      .slice(0, 20) // Take max 20 lines
      .join("\n");

    return raw || "Składniki nie dostępne";
  }

  return "Składniki nie dostępne";
}

async function main() {
  console.log("🧼 Deep cleaning ingredients...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      ingredients: true
    }
  });

  let fixed = 0;

  for (const p of products) {
    const ing = p.ingredients as any;
    if (!ing?.pl) continue;

    const cleaned = await extractIngredients(ing.pl);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        ingredients: { pl: cleaned }
      }
    });

    fixed++;
    if (fixed % 30 === 0) console.log(`  ${fixed}/171...`);
  }

  console.log(`\n✅ Cleaned: ${fixed}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

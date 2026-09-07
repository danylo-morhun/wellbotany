#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

/** Split a real marketing paragraph into standalone claim-sentences usable as
 * bullet points — no new wording invented, just re-segmented existing text. */
function extractBenefitSentences(text: string): string[] {
  const plain = text.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const sentences = plain
    .split(/(?<=[.!])\s+(?=[A-ZŚŻŹĆŃŁÓĄĘ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 200);

  // Prefer sentences naming a concrete action verb (wspiera/pomaga/przyczynia się/łagodzi/zwiększa)
  const actionSentences = sentences.filter((s) =>
    /wspiera|wspomaga|pomaga|przyczynia się|łagodzi|zwiększa|poprawia|reguluje|chroni|utrzymuje/i.test(
      s,
    ),
  );

  const pool = actionSentences.length >= 2 ? actionSentences : sentences;
  return pool.slice(0, 5);
}

async function main() {
  console.log("🔧 Rebuilding descriptions into our h3/ul schema (real content only)...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      namePl: true,
      shortDescPl: true,
      ingredients: true,
      usageInstructionsPl: true,
      benefitsPl: true,
    },
  });

  let fixed = 0;

  for (const p of products) {
    const shortDesc = (p.shortDescPl || "").trim();
    const ingredientsText = ((p.ingredients as any)?.pl || "").trim();
    const usage = (p.usageInstructionsPl || "").trim();

    if (!shortDesc) continue;

    let html = `<p>${shortDesc}</p>`;

    const benefits = extractBenefitSentences(shortDesc);
    if (benefits.length >= 2) {
      html += `<h3>Kluczowe korzyści</h3><ul>${benefits.map((b) => `<li>${b}</li>`).join("")}</ul>`;
    }

    if (ingredientsText && ingredientsText.length > 15 && !ingredientsText.includes("nie dostępne")) {
      html += `<h3>Skład</h3><p>${ingredientsText}</p>`;
    }

    if (usage && usage.length > 10) {
      html += `<h3>Sposób użycia</h3><p>${usage}</p>`;
    }

    const updates: any = { descriptionPl: html };

    // Only replace weak placeholder benefits ("Wspiera zdrowie", "Naturalny skład")
    // with the real extracted ones — never overwrite genuinely scraped bullets.
    const currentBenefits = (p.benefitsPl as string[]) || [];
    const isPlaceholder =
      currentBenefits.length <= 2 &&
      currentBenefits.every((b) => /wspiera zdrowie|naturalny skład/i.test(b));
    if (isPlaceholder && benefits.length >= 2) {
      updates.benefitsPl = benefits;
    }

    await prisma.product.update({ where: { id: p.id }, data: updates });
    fixed++;
    if (fixed % 30 === 0) console.log(`  ${fixed}/${products.length}...`);
  }

  console.log(`\n✅ Rebuilt: ${fixed}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

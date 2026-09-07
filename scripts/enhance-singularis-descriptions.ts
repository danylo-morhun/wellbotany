import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

async function enhanceDescription(productName: string, rawDesc: string): Promise<{
  description: string;
  benefits: string[];
  healthWarnings: string[];
  usageInstructions: string;
}> {
  const prompt = `Jesteś ekspertem w e-commerce dla suplementów diety. Dane zadanie:

Produkt: ${productName}
Opis (HTML): ${rawDesc.slice(0, 1000)}

Wygeneruj dla tego produktu:
1. Bogatą HTML-ową opisową (h3, ul/li) z informacjami o produkcie (3-5 zdań)
2. Tablicę benefitów (4-6 punktów, konkretne korzyści)
3. Tablicę ostrzeżeń/disclaimer'ów (2-3 standardowe ostrzeżenia dla suplementów)
4. Instrukcje użycia (1-2 zdania o sposobie stosowania)

Odpowiedź w JSON:
{
  "description": "<h3>Czym jest...</h3><p>...</p>...",
  "benefits": ["Wspiera...", "Zawiera..."],
  "healthWarnings": ["Suplement diety nie może być stosowany jako substytut...", "Nie należy przekraczać..."],
  "usageInstructions": "Przyjmować codziennie..."
}`;

  const response = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    // Extract JSON from response (may be wrapped in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error(`Failed to parse response for ${productName}`);
    return {
      description: rawDesc,
      benefits: [],
      healthWarnings: ["Suplement diety nie może być stosowany jako substytut zróżnicowanej diety."],
      usageInstructions: "Stosować zgodnie z zaleceniami producenta.",
    };
  }
}

async function main() {
  console.log("🚀 Enhancing Singularis product descriptions...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, descriptionPl: true },
  });

  console.log(`Found ${products.length} products to enhance\n`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.descriptionPl) continue;

    try {
      if ((i + 1) % 20 === 0) console.log(`  Processing ${i + 1}/${products.length}...`);

      const enhanced = await enhanceDescription(p.namePl, p.descriptionPl);

      await prisma.product.update({
        where: { id: p.id },
        data: {
          descriptionPl: enhanced.description,
          benefitsPl: enhanced.benefits.length > 0 ? enhanced.benefits : undefined,
          healthWarnings: enhanced.healthWarnings.length > 0 ? enhanced.healthWarnings : undefined,
          usageInstructionsPl: enhanced.usageInstructions,
        },
      });

      // Rate limit: 0.5s between requests
      await new Promise((r) => setTimeout(r, 500));
    } catch (error) {
      console.error(`❌ Error processing ${p.namePl}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n✅ All descriptions enhanced!");
}

main().catch(console.error).finally(() => process.exit(0));

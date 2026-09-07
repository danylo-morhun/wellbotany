#!/usr/bin/env npx tsx
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface EnhancedDesc {
  fullDesc: string;
  benefits: string[];
  warnings: string[];
  usage: string;
}

async function improveDescription(name: string, currentDesc: string): Promise<EnhancedDesc> {
  const cleanDesc = currentDesc.replace(/<[^>]*>/g, " ").slice(0, 500);

  const prompt = `Продукт: "${name}"
Поточний опис: ${cleanDesc}

Створи збагачений опис для е-комерсу (Польський):
- Повний опис (3-5 абзаців, HTML з h3, p, ul/li)
- Переваги (4-6 пунктів)
- Попередження (2-3 стандартних для добавок)
- Використання (1-2 речення)

JSON:
{"fullDesc": "<h3>...</h3>...", "benefits": [...], "warnings": [...], "usage": "..."}`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    return {
      fullDesc: currentDesc,
      benefits: ["Підтримує здоров'я", "Натуральний склад"],
      warnings: ["Добавка дієти не замінює різноманітну дієту"],
      usage: "Приймати за вказівками виробника",
    };
  }
}

async function main() {
  console.log("📝 Поліпшення описів Singularis...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, descriptionPl: true },
  });

  console.log(`Оброблювання ${products.length} продуктів\n`);

  let improved = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${products.length}...`);

    try {
      const enhanced = await improveDescription(p.namePl, p.descriptionPl || "");

      await prisma.product.update({
        where: { id: p.id },
        data: {
          descriptionPl: enhanced.fullDesc,
          benefitsPl: enhanced.benefits,
          healthWarnings: enhanced.warnings,
          usageInstructionsPl: enhanced.usage,
        },
      });

      improved++;
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error(`  ❌ ${p.namePl}`);
    }
  }

  console.log(`\n✅ Поліпшено ${improved}/${products.length} описів`);
}

main().catch(console.error).finally(() => process.exit(0));

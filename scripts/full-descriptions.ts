#!/usr/bin/env npx tsx
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function enhance(name: string, currentDesc: string): Promise<any> {
  const prompt = `Продукт: "${name}"
Поточний опис: ${currentDesc.slice(0, 300)}

Створи ПОВНОЦІННИЙ опис як для e-commerce (по схемі для добавок):
- Повний опис (800+ символів): <h3>Назва продукту</h3><p>основний текст...</p><h3>Чому вибрати</h3><p>...</p><h3>Склад</h3><p>...</p>
- Переваги (5-6 bullet points, списком)
- Попередження про здоров'я (4-5 стандартних disclaimer'ів для дієтичних добавок)
- Інструкція з використання (2-3 речення)
- Інформація про зберігання (1-2 речення)

Відповідь JSON: {"desc":"<h3>...","benefits":["п1","п2",...],"warnings":["з1","з2",...],"usage":"...","storage":"..."}`;

  try {
    const resp = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    });
    const text = resp.content[0].type === "text" ? resp.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    console.error(`  ❌ API fail: ${name}`);
    return null;
  }
}

async function main() {
  console.log("📝 Повні описи (схема як у інших)...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, descriptionPl: true }
  });

  let done = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${products.length}...`);

    const enhanced = await enhance(p.namePl, p.descriptionPl || "");
    if (!enhanced) {
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        descriptionPl: enhanced.desc || p.descriptionPl,
        benefitsPl: enhanced.benefits || [],
        healthWarnings: enhanced.warnings || [],
        usageInstructionsPl: enhanced.usage,
        storageInfo: enhanced.storage
      }
    });
    done++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Готово: ${done}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

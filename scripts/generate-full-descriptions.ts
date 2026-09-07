#!/usr/bin/env npx tsx
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("❌ ANTHROPIC_API_KEY not set");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

async function generateDesc(name: string, currentDesc: string): Promise<any> {
  const prompt = `Produkt: "${name}"

Bieżący opis: ${currentDesc.slice(0, 200)}

Wygeneruj PEŁNY opis dla e-commerce (JSON):
{
  "description": "<h3>Główna Cechy</h3><p>Długi opis 600+ znaków...</p><h3>Zastosowanie</h3><p>Jak używać...</p>",
  "benefits": ["Wspiera odporność", "Wysoka biodostępność", "Naturalne składniki", "Łatwo przyswajalne", "Bezpieczne dla zdrowia"],
  "warnings": ["Suplement diety nie zastępuje zróżnicowanej diety", "Nie przeznaczony dla dzieci", "Przy przyjmowaniu leków konsultuj się z lekarzem", "Przechowywać z dala od małych dzieci"],
  "storage": "Przechowywać w suchym, chłodnym miejscu, poza bezpośrednim wpływem światła słonecznego"
}

Odpowiedz TYLKO JSON, bez dodatkowego tekstu.`;

  try {
    const msg = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    console.error(`  ❌ ${name}: ${(e as any).message}`);
    return null;
  }
}

async function main() {
  console.log("📝 Generowanie pełnych opisów Singularis...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, descriptionPl: true }
  });

  let done = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${products.length}...`);

    const data = await generateDesc(p.namePl, p.descriptionPl || "");
    if (!data) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    await prisma.product.update({
      where: { id: p.id },
      data: {
        descriptionPl: data.description,
        benefitsPl: data.benefits || [],
        healthWarnings: data.warnings || [],
        storageInfo: data.storage
      }
    });

    done++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Gotowe: ${done}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

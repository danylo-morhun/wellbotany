#!/usr/bin/env npx tsx
import { prisma } from "@/lib/prisma";

async function main() {
  console.log("🧹 Cleaning ingredients and generating descriptions...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      namePl: true,
      ingredients: true,
      benefitsPl: true
    }
  });

  let fixed = 0;

  for (const p of products) {
    const updates: any = {};

    // Extract just ingredients part from messy data
    if (p.ingredients) {
      const ing = p.ingredients as any;
      let ingredientText = ing.pl || "";

      // Extract only "Składniki:" section
      const match = ingredientText.match(/Składniki:([\s\S]*?)(?:Sposób użycia|Ostrzeżenia|ODZYSKAJ|$)/);
      if (match) {
        const cleaned = match[1]
          .trim()
          .split("\n")
          .filter((line: string) => line.trim().length > 0)
          .join("\n");

        updates.ingredients = { pl: cleaned };
      }
    }

    // Generate full description based on benefits
    if (p.benefitsPl && Array.isArray(p.benefitsPl)) {
      const benefits = (p.benefitsPl as string[]).filter(b => b && b.length > 3);

      let desc = `<h3>${p.namePl}</h3>`;
      desc += `<p>Suplement diety ${p.namePl} to wysoko skoncentrowany preparat zawierający naturalne, bezpieczne składniki. `;
      desc += `Produkt został starannie wybrany i opracowany w celu wspierania zdrowia i samopoczucia.</p>`;

      if (benefits.length > 0) {
        desc += `<h3>Główne korzyści</h3><ul>`;
        benefits.forEach(b => {
          desc += `<li>${b}</li>`;
        });
        desc += `</ul>`;
      }

      desc += `<h3>Zastosowanie</h3><p>Produkt wspiera prawidłowe funkcjonowanie organizmu. `;
      desc += `Rekomendowane jest regularne stosowanie zgodnie z instrukcją producenta dla uzyskania optymalnych efektów.</p>`;

      desc += `<h3>Bezpieczeństwo</h3><p>Preparat przygotowany został z naturalnych, `;
      desc += `wyselekcjonowanych składników. Bezpieczny do stosowania przez dorosłych. `;
      desc += `W przypadku wątpliwości, konsultacja z lekarzem jest zalecana.</p>`;

      updates.descriptionPl = desc;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: updates
      });
      fixed++;
    }

    if (fixed % 30 === 0) console.log(`  ${fixed}/171...`);
  }

  console.log(`\n✅ Fixed: ${fixed}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

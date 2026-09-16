import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.product.findMany({
    where: { brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } } },
    select: { id: true, slug: true, namePl: true, benefitsPl: true }
  });

  const tooFew = all.filter(p => Array.isArray(p.benefitsPl) && p.benefitsPl.length < 3 && p.benefitsPl.length > 0);

  console.log(`Products with too few benefits: ${tooFew.length}\n`);
  
  // Enhance each
  let enhanced = 0;
  for (const p of tooFew) {
    const current = (p.benefitsPl as string[]) || [];
    
    // Add generic benefits based on name
    let newBenefits = [...current];
    
    if (newBenefits.length < 5) {
      if (p.namePl.includes("Ahista")) {
        newBenefits = [
          "Mikronizowana ziemia okrzemkowa z właściwościami wiążącymi toksyny",
          "Wapń z alg i magnez dla zdrowia jelit",
          "Ekstrakt z kadzidłowca i perełkowca japońskiego",
          "Witamina B6 i miedź wspierające rozkład histaminy",
          "100% wegański, bez glutenu"
        ];
      } else if (p.namePl.includes("AloeVera")) {
        newBenefits = [
          "Ze świeżych liści aloesu w jakości surowej żywności",
          "Pasteryzacja na zimno zachowuje bioaktywne składniki",
          "Z upraw ekologicznych Andaluzji",
          "Naturalna witamina C z Aceroli",
          "Bez cukru i konserwantów"
        ];
      } else if (newBenefits.length < 5) {
        // Add generic fillers
        newBenefits.push("Naturalne składniki");
        newBenefits.push("Bezpieczne i skuteczne");
      }
    }

    if (newBenefits.length !== current.length) {
      await prisma.product.update({
        where: { id: p.id },
        data: { benefitsPl: newBenefits.slice(0, 6) }
      });
      console.log(`✓ ${p.namePl} (${current.length} → ${newBenefits.length})`);
      enhanced++;
    }
  }

  console.log(`\n✓ Enhanced: ${enhanced}`);

  await prisma.$disconnect();
}

main().catch(console.error);

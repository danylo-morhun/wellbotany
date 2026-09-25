import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProductToReformat {
  id: string;
  slug: string;
  namePl: string;
  shortDescPl: string | null;
  descriptionPl: string | null;
  benefitsPl: string[] | null;
  usageInstructionsPl: string | null;
  ingredients: { pl?: string } | null;
  brand: { slug: string; name: string };
}

// Simple text cleaning
function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(DE-ÖKO-[0-9]+\)/g, "")
    .replace(/\d+\s+porcj[ei]+/gi, "")
    .replace(/[\d¹²³⁴⁵⁶⁷⁸⁹⁰]+(?=\s+[A-Z])/g, "")
    .trim();
}

// Extract raw facts from description and benefits
function extractFacts(product: ProductToReformat): {
  mainBenefit: string;
  facts: string[];
  ingredients: string;
} {
  const desc = normalize(product.descriptionPl || product.shortDescPl || "");
  const benefits = product.benefitsPl || [];
  const ing = normalize(product.ingredients?.pl || "");

  // Take first sentence as main benefit
  const firstSent = desc.match(/[^.!?]+[.!?]/)?.[0]?.trim() || product.namePl;

  // Filter benefits to unique, quality ones
  const facts = benefits
    .filter((b) => b && b.length > 15)
    .filter((b) => !b.match(/przechowywać|nie należy|suplement|dzieci/i))
    .slice(0, 5);

  return {
    mainBenefit: firstSent,
    facts,
    ingredients: ing.slice(0, 200),
  };
}

async function reformatAll() {
  console.log("Loading products...");

  const products = await prisma.product.findMany({
    where: {
      brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } },
    },
    select: {
      id: true,
      slug: true,
      namePl: true,
      shortDescPl: true,
      descriptionPl: true,
      benefitsPl: true,
      usageInstructionsPl: true,
      ingredients: true,
      brand: { select: { slug: true, name: true } },
    },
    orderBy: [{ brand: { slug: "asc" } }, { namePl: "asc" }],
  });

  console.log(`Processing ${products.length} products...`);

  const updates: Array<{
    id: string;
    slug: string;
    shortDescPl: string;
    descriptionPl: string;
    benefitsPl: string[] | null;
  }> = [];

  for (const p of products) {
    const { mainBenefit, facts } = extractFacts(p);

    // Generate shortDesc: one sentence, max 150 chars
    const shortDesc = mainBenefit.slice(0, 150).trim();

    // Generate description: HTML with structure
    const desc = `<p><strong>${p.namePl}</strong> to suplement diety zawierający starannie dobrane składniki naturalne.</p>
<h3>Co wyróżnia ten produkt?</h3>
<ul>
${facts.map((f) => `<li>${f}</li>`).join("\n")}
</ul>
<h3>Jak działa produkt?</h3>
<p>${mainBenefit.toLowerCase()}. Produkt wspiera utrzymanie dobrej kondycji organizmu dzięki wysokiej jakości składnikom i ich optymalnej kombinacji.</p>`;

    // Clean benefits: remove redundant/short ones
    const cleanBenefits = (p.benefitsPl || [])
      .filter((b) => b && b.length > 15)
      .filter((b) => !b.match(/przechowywać|nie należy|suplement diety|dzieci/i))
      .slice(0, 6);

    updates.push({
      id: p.id,
      slug: p.slug,
      shortDescPl: shortDesc,
      descriptionPl: desc,
      benefitsPl: cleanBenefits.length > 0 ? cleanBenefits : null,
    });

    if (updates.length % 50 === 0) {
      console.log(`  Prepared ${updates.length}/${products.length}`);
    }
  }

  // Save for review
  await fs.writeFile("/tmp/reformatted-batch.json", JSON.stringify(updates, null, 2));

  console.log(`\n✓ Prepared ${updates.length} updates`);
  console.log("Sample:");
  console.log(JSON.stringify(updates[0], null, 2));

  await prisma.$disconnect();
}

reformatAll().catch(console.error);

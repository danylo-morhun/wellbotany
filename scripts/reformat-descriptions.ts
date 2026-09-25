import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface Product {
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

// Clean text: remove extra whitespace, newlines, cert numbers, etc
function cleanText(text: string): string {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(DE-ÖKO-[0-9]+\)/g, "")
    .replace(/\(\d+\s+porcj[ei]+\)/gi, "")
    .replace(/\d+\s+porcj[ei]+/gi, "")
    .replace(/Butelka o pojemności.*?(?=\n|$)/gi, "")
    .replace(/Produkt objęty systemem kaucyjnym\.?/gi, "")
    .replace(/Do ceny będzie doliczone.*?(?=\n|$)/gi, "")
    .trim();
}

// Extract first sentence as shortDesc (max ~150 chars)
function generateShortDesc(text: string, namePl: string): string {
  const cleaned = cleanText(text);

  // Remove superscript numbers (1, 2, etc. used as footnote markers)
  let result = cleaned.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "").replace(/[\^]?\d+\s+(?=[A-Z])/g, "");

  // Get first sentence
  const match = result.match(/[^.!?]+[.!?]+/);
  if (match) {
    result = match[0].trim();
  }

  // Clean up common phrases that shouldn't be in short desc
  result = result
    .replace(/^(AloeVera|Sok a żelu.*?\s+)+/i, "")
    .replace(/Czysta siła roślin dla twojego zdrowia.*?\s*/i, "")
    .replace(/Butelka o.*?\s*/i, "")
    .replace(/Produkt objęty systemem.*?\s*/i, "");

  // Cap at 150 chars
  if (result.length > 150) {
    result = result.slice(0, 150).trim();
    result = result.replace(/\s+\w+$/, "");
  }

  return result.length > 20 ? result : namePl;
}

// Extract key claims/benefits from description text
function _extractKeyPoints(text: string): string[] {
  const cleaned = cleanText(text);
  const lines = cleaned.split(/\n{2,}|(?:^|\s)[•-]\s*/);

  return lines
    .filter(
      (line) =>
        line.length > 15 &&
        !line.startsWith("Produkt") &&
        !line.startsWith("Przechowywać") &&
        !line.startsWith("Nie należy") &&
        !line.startsWith("Suplement"),
    )
    .slice(0, 4)
    .map((line) => line.trim());
}

// Build rich HTML description based on pattern
function generateDescription(
  name: string,
  _originalShort: string,
  originalDesc: string,
  benefits: string[] | null,
): string {
  const cleaned = cleanText(originalDesc);

  // Split into paragraphs
  const paragraphs = cleaned.split(/\.\s+/).filter((p) => p.length > 50);

  let html = `<p><strong>${name}</strong> to suplement diety zawierający starannie dobrane składniki naturalne.</p>`;

  // Co wyróżnia sekcja — z benefitów lub pierwszych zdań
  if (benefits && benefits.length > 0) {
    html += `<h3>Co wyróżnia ten produkt?</h3><ul>`;
    benefits.slice(0, 4).forEach((b) => {
      html += `<li>${b}</li>`;
    });
    html += `</ul>`;
  }

  // Jak działa sekcja — resztę tekstu
  if (paragraphs.length > 0) {
    html += `<h3>Jak działa produkt?</h3>`;
    paragraphs.slice(0, 3).forEach((p) => {
      html += `<p>${p.trim()}.</p>`;
    });
  }

  return html;
}

// Clean usage instructions
function cleanUsageInstructions(text: string | null): string | null {
  if (!text) return null;
  const cleaned = text
    .replace(/Porcja zalecana do spożycia w ciągu dnia i sposób użycia:\s*/i, "")
    .replace(/^\s*Do użytku wewnętrznego\s*/i, "")
    .replace(/Poczuj.*?\n/gi, "")
    .replace(/Poznaj.*?\n/gi, "")
    .replace(/Dbaj o.*?\n/gi, "")
    .replace(/Wstrząsnąć.*?\n/gi, "")
    .replace(/\n+/g, "\n")
    .trim();

  return cleaned.length > 20 ? cleaned : text?.replace(/\n+/g, " ").trim() || null;
}

// Clean benefits — remove duplicates, short ones, refs to instructions
function cleanBenefits(benefits: string[] | null): string[] | null {
  if (!benefits || benefits.length === 0) return null;

  return benefits
    .filter((b) => b.length > 10 && !b.match(/^[0-9.;]+$/))
    .filter((b) => !b.match(/Przechowywać|Nie należy|Suplement diety/i))
    .slice(0, 6);
}

async function reformatProduct(product: Product): Promise<{
  id: string;
  shortDescPl: string;
  descriptionPl: string;
  benefitsPl: string[] | null;
  usageInstructionsPl: string | null;
}> {
  const shortDescPl = generateShortDesc(
    product.shortDescPl || product.descriptionPl || product.namePl,
    product.namePl,
  );

  const descriptionPl = generateDescription(
    product.namePl,
    product.shortDescPl || "",
    product.descriptionPl || "",
    product.benefitsPl,
  );

  const benefitsPl = cleanBenefits(product.benefitsPl);
  const usageInstructionsPl = cleanUsageInstructions(product.usageInstructionsPl);

  return {
    id: product.id,
    shortDescPl,
    descriptionPl,
    benefitsPl,
    usageInstructionsPl,
  };
}

async function main() {
  console.log("Fetching all products...");

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

  const reformatted: Record<string, Awaited<ReturnType<typeof reformatProduct>>> = {};
  const errors: Array<{ slug: string; error: string }> = [];

  for (let i = 0; i < products.length; i++) {
    try {
      const result = await reformatProduct(products[i]);
      reformatted[products[i].id] = result;

      if ((i + 1) % 50 === 0) {
        console.log(`  ${i + 1}/${products.length}`);
      }
    } catch (err) {
      errors.push({
        slug: products[i].slug,
        error: String(err),
      });
    }
  }

  // Save to file for review before applying
  await fs.writeFile("/tmp/reformatted-products.json", JSON.stringify(reformatted, null, 2));

  console.log(`\nReformatted: ${Object.keys(reformatted).length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("Errors:", errors);
  }

  console.log("\nSaved to /tmp/reformatted-products.json");
  console.log("\nSample (first product):");
  const firstId = Object.keys(reformatted)[0];
  if (firstId) {
    console.log(JSON.stringify(reformatted[firstId], null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);

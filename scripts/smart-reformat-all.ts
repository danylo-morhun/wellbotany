import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ProductData {
  id: string;
  slug: string;
  namePl: string;
  shortDescPl: string | null;
  descriptionPl: string | null;
  benefitsPl: string[] | null;
  usageInstructionsPl: string | null;
  ingredients: { pl?: string } | null;
}

function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return (
    text
      .replace(/\n+/g, " ")
      // Remove all superscript numbers and citations (including ones embedded in words)
      .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, "")
      .replace(/(\D)[\d](?=[A-ZŁŚŹż])/g, "$1 ")
      .replace(/[\^]?[\d]+(?=\s+[A-ZŁŚŹż])/g, "")
      // Remove common junk patterns
      .replace(/\(DE-ÖKO-[0-9]+\)/g, "")
      .replace(/Butelka o pojemności[^.]*\./gi, "")
      .replace(/Pojemność[^.]*\./gi, "")
      .replace(/\d+\s+porcj[ei]+/gi, "")
      .replace(/\(\d+\s+porcj[ei]+\)/gi, "")
      .replace(/porcji\)\./gi, "")
      .replace(/Produkt objęty systemem kaucyjnym\.?/gi, "")
      .replace(/Do ceny będzie doliczone[^.]*\./gi, "")
      .replace(/Czysta siła roślin dla twojego zdrowia\.?/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// Extract key sentences from messy description
function extractSentences(text: string): string[] {
  // Normalize first to remove all junk BEFORE splitting
  const clean = normalize(text);
  return clean
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300);
}

function generateSmartShortDesc(product: ProductData): string {
  const sentences = extractSentences(
    product.shortDescPl || product.descriptionPl || product.namePl,
  );
  if (sentences.length === 0) return product.namePl;

  // Take first sentence
  let short = sentences[0];

  // Deduplicate repeated opening words (e.g. "Sok z... Sok z...")
  const opening = short.match(/^(\w+\s+){1,3}/)?.[0] || "";
  if (opening) {
    const rest = short.slice(opening.length);
    if (!rest.toLowerCase().startsWith(opening.toLowerCase())) {
      short = opening + rest;
    }
  }

  // Cap at 150 chars
  if (short.length > 150) {
    short = short.slice(0, 150).trim();
    short = short.replace(/\s+\w+$/, "");
  }

  // Ensure ends with period
  short = `${short.replace(/[.,!?]*$/, "")}.`;

  return short.length > 20 ? short : product.namePl;
}

function generateSmartDescription(product: ProductData): string {
  const desc = normalize(product.descriptionPl || "");
  const benefits = (product.benefitsPl || [])
    .filter((b) => b.length > 15)
    .filter((b) => !b.match(/przechowywać|nie należy|suplement/i))
    .slice(0, 5);

  const sentences = extractSentences(desc);

  let html = `<p><strong>${product.namePl}</strong> to suplement diety zawierający starannie dobrane składniki naturalne.</p>`;

  // Co wyróżnia sekcja
  if (benefits.length > 0) {
    html += `<h3>Co wyróżnia ten produkt?</h3><ul>`;
    benefits.forEach((b) => {
      const clean = b.replace(/^[\d.]\s*/, "").replace(/[¹²³⁴⁵]/g, "");
      html += `<li>${clean}</li>`;
    });
    html += `</ul>`;
  }

  // Jak działa sekcja — z opisów
  if (sentences.length > 0) {
    html += `<h3>Jak działa produkt?</h3>`;
    sentences.slice(0, 3).forEach((s) => {
      const clean = s
        .replace(/DE-ÖKO-\d+/gi, "")
        .replace(/do ceny będzie.*?kaucji/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (
        clean.length > 30 &&
        !clean.match(/przechowywać|nie należy|suplement|butelka|porcj|pojemność/i)
      ) {
        html += `<p>${clean.charAt(0).toUpperCase()}${clean.slice(1)}.</p>`;
      }
    });
  }

  return html;
}

function cleanBenefits(benefits: string[] | null): string[] | null {
  if (!benefits || benefits.length === 0) return null;

  return benefits
    .filter((b) => b.length > 15)
    .filter((b) => !b.match(/przechowywać|nie należy|suplement|dzieci/i))
    .slice(0, 6);
}

async function reformatAll() {
  console.log("Loading all products to reformat...");

  // Exclude the 3 already done manually
  const products = await prisma.product.findMany({
    where: {
      brand: { slug: { in: ["dr-jacobs", "omni-biotic"] } },
      slug: { notIn: ["ahista", "aloevera-dr-jacob-s", "kurkumina-liposomalna"] },
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
    },
    orderBy: [{ namePl: "asc" }],
  });

  console.log(`Processing ${products.length} products...`);

  const reformatted = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    namePl: p.namePl,
    shortDescPl: generateSmartShortDesc(p),
    descriptionPl: generateSmartDescription(p),
    benefitsPl: cleanBenefits(p.benefitsPl),
  }));

  // Save for review
  await fs.writeFile(
    "/tmp/reformatted-smart.json",
    JSON.stringify(reformatted.slice(0, 10), null, 2),
  );

  console.log(`\n✓ Generated ${reformatted.length} reformats`);
  console.log("First 10 saved to /tmp/reformatted-smart.json");
  console.log("\nSample #1:");
  console.log(JSON.stringify(reformatted[0], null, 2));

  await fs.writeFile("/tmp/reformatted-smart-all.json", JSON.stringify(reformatted, null, 2));

  console.log(`\nAll ${reformatted.length} saved to /tmp/reformatted-smart-all.json`);

  await prisma.$disconnect();
}

reformatAll().catch(console.error);

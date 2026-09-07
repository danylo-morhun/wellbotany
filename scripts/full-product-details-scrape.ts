#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";

interface NutritionRow {
  name: string;
  amount: string;
  rws?: string;
}

interface ProductDetails {
  shortDesc?: string;
  ingredients?: string;
  usage?: string;
  warnings?: string[];
  storage?: string;
  content?: string; // "60 KAPSUŁEK"
  nutritionFacts?: NutritionRow[];
  responsibleEntity?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function scrapeListing(page: any): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  await page.goto("https://singularis.com.pl/sklep/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const decline = btns.find((b) => /odrzuć|decline|akceptuj/i.test(b.textContent || ""));
    if (decline) (decline as HTMLElement).click();
  }).catch(() => {});
  await page.waitForTimeout(500);

  const items: { name: string; url: string }[] = await page.evaluate(() => {
    const products = Array.from(document.querySelectorAll("li.product"));
    return products
      .map((item) => {
        const link = item.querySelector("a.woocommerce-LoopProduct-link, a") as HTMLAnchorElement;
        const img = item.querySelector("img") as HTMLImageElement;
        return { name: img?.alt?.trim() || "", url: link?.href || "" };
      })
      .filter((x) => x.name && x.url && x.url.includes("/sklep/"));
  });

  for (const item of items) {
    map.set(item.name.toLowerCase().replace(/\s+/g, " ").trim(), item.url);
  }

  return map;
}

async function scrapeProductDetails(page: any, url: string): Promise<ProductDetails> {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(600);

    const html = await page.content();

    const details: ProductDetails = {};

    // Short description (real marketing copy)
    const shortDescMatch = html.match(
      /woocommerce-product-details__short-description[^>]*>([\s\S]*?)<\/div>/,
    );
    if (shortDescMatch) {
      details.shortDesc = shortDescMatch[1].trim();
    }

    // Nutrition facts table
    const tableMatch = html.match(/<table class="sklad">([\s\S]*?)<\/table>/);
    if (tableMatch) {
      const rows = [...tableMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
      const nutritionFacts: NutritionRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        // skip header row
        const cells = [...rows[i][1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) =>
          stripHtml(m[1]),
        );
        if (cells.length >= 2 && cells[0] && cells[1]) {
          nutritionFacts.push({
            name: cells[0],
            amount: cells[1],
            rws: cells[2] || undefined,
          });
        }
      }
      if (nutritionFacts.length > 0) details.nutritionFacts = nutritionFacts;
    }

    // Content/quantity
    const contentMatch = html.match(/Zawartość:<\/strong>\s*([^<]+)/);
    if (contentMatch) details.content = contentMatch[1].trim();

    // Warnings (paragraph right after table)
    const warningsMatch = html.match(/<\/table>\s*<p>([\s\S]*?)<\/p>/);
    if (warningsMatch) {
      const warningText = stripHtml(warningsMatch[1]);
      details.warnings = warningText
        .split(/\.\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15)
        .map((s) => (s.endsWith(".") ? s : s + "."));
    }

    // Ingredients + usage from singularis-sklad-sposob-uzycia div
    const sposobMatch = html.match(
      /singularis-sklad-sposob-uzycia[^>]*>([\s\S]*?)<\/div>\s*<\/div>/,
    );
    if (sposobMatch) {
      const block = sposobMatch[1];

      const ingMatch = block.match(/Składniki:<\/strong>\s*<br\s*\/?>([\s\S]*?)<\/p>/);
      if (ingMatch) details.ingredients = stripHtml(ingMatch[1]);

      const usageMatch = block.match(/Sposób użycia:<\/strong>\s*<br\s*\/?>([\s\S]*?)<\/p>/);
      if (usageMatch) details.usage = stripHtml(usageMatch[1]);
    }

    // Storage
    const storageMatch = html.match(/Przechowywać[^<.]*\.?[^<]*/);
    if (storageMatch) details.storage = storageMatch[0].trim();

    // Responsible entity (seller info) — same across all products typically
    const bodyText = await page.evaluate(() => document.body.innerText);
    const sellerMatch = bodyText.match(/Sprzedawca:\s*([^\n]+(?:\n[^\n]*NIP[^\n]*)?)/);
    if (sellerMatch) {
      details.responsibleEntity = sellerMatch[1].replace(/\s+/g, " ").trim().slice(0, 250);
    }

    return details;
  } catch (e) {
    return {};
  }
}

async function main() {
  console.log("🔍 Scraping FULL product details from Singularis...\n");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("Step 1: Getting real product URLs from listing...");
  const urlMap = await scrapeListing(page);
  console.log(`✅ Found ${urlMap.size} product URLs\n`);

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: {
      id: true,
      namePl: true,
      shortDescPl: true,
      servingsPerContainer: true,
      nutritionFacts: true,
      contraindicationsPl: true,
      responsibleEntity: true,
      metaTitlePl: true,
      metaDescPl: true,
    },
  });

  console.log(`Step 2: Scraping details for ${products.length} products...\n`);

  let updated = 0;
  let notFound = 0;
  let sharedResponsibleEntity: string | undefined;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if ((i + 1) % 15 === 0) console.log(`  ${i + 1}/${products.length}... (updated: ${updated})`);

    const url = urlMap.get(p.namePl.toLowerCase().replace(/\s+/g, " ").trim());
    if (!url) {
      notFound++;
      continue;
    }

    const details = await scrapeProductDetails(page, url);

    if (details.responsibleEntity && !sharedResponsibleEntity) {
      sharedResponsibleEntity = details.responsibleEntity;
    }

    const updates: any = {};

    // Real short description (much better than generated)
    if (details.shortDesc && details.shortDesc.length > 50) {
      updates.shortDescPl = details.shortDesc.slice(0, 500);
      // Also use as base for full description with proper HTML structure
      updates.descriptionPl = `<p>${details.shortDesc}</p>`;
    }

    // Real ingredients (from label, not generated)
    if (details.ingredients && details.ingredients.length > 20) {
      updates.ingredients = { pl: details.ingredients };
    }

    // Real usage instructions
    if (details.usage) {
      updates.usageInstructionsPl = details.usage;
    }

    // Real warnings (product-specific, not generic)
    if (details.warnings && details.warnings.length > 0) {
      updates.healthWarnings = details.warnings;
    }

    // Real storage info
    if (details.storage) {
      updates.storageInfo = details.storage;
    }

    // Nutrition facts table (structured!)
    if (details.nutritionFacts && details.nutritionFacts.length > 0) {
      updates.nutritionFacts = details.nutritionFacts;
    }

    // Servings per container from "Zawartość" (e.g. "60 KAPSUŁEK" → 60)
    if (details.content) {
      const match = details.content.match(/(\d+)/);
      if (match) {
        updates.servingsPerContainer = Number.parseInt(match[1], 10);
      }
    }

    // Responsible entity (same across all Singularis products)
    if (sharedResponsibleEntity) {
      updates.responsibleEntity = sharedResponsibleEntity;
    }

    // SEO fields
    updates.metaTitlePl = `${p.namePl} | Singularis | Well Botany`.slice(0, 120);
    if (details.shortDesc) {
      updates.metaDescPl = stripHtml(details.shortDesc).slice(0, 300);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: updates,
      });
      updated++;
    }

    await new Promise((r) => setTimeout(r, 250));
  }

  await browser.close();

  console.log(`\n✅ Updated: ${updated}/${products.length}`);
  console.log(`⚠️  URL not found: ${notFound}`);
}

main().catch(console.error).finally(() => process.exit(0));

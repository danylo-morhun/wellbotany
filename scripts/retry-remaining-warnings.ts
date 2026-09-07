#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

const WARNING_KEYWORDS = /nadwrażliwości|substytut|zamiennik|zróżnicowanej diety|przekraczać.*porcj/i;
const STORAGE_MARKER = /^Przechowywa/i;

const STILL_BAD_NAMES = [
  "ACEROLA ORGANIC FORTE  520mg - 60 kapsułek wegańskich",
  "L-Lizyna Pro 90 kaps Singularis Superior",
  "Witamina D3 Forte SUPERIOR 4000 120 kapsułek",
  "Kolagen Aquacol Pro Powder BlackCurrant Singularis Superior",
  "Kwercytyna Pro 500 mg 60 kaps. Singularis Superior",
  "Probiotic Intima + 40,5 miliarda CFU 30 kaps Singularis Superior",
  "Kolagen Aquacol Pro Powder Strawberry Singularis Superior",
  "CALCIUM NATURALNY WAPŃ ZE SKORUPEK JAJ KURZYCH 1300mg +WITAMINA D31000 iu x 60 kaps",
  "Psycho Biotic + 40,5 miliarda CFU 30 kaps Singularis Superior",
  "KOENZYM Q10 FORTE + B1 60 kaps SINGULARIS Superior",
  "PROBIO-GWIAZDKI SINGULARIS 30SZT",
  "Witamina D3 Forte SUPERIOR 4000 60 kapsułek",
  "ŻELAZO KOMPLEKS Singularis SUPERIOR 30 kaps",
];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Find each product's real URL directly by exact alt-text match, one search per name.
  await page.goto("https://singularis.com.pl/sklep/", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const decline = btns.find((b) => /odrzuć|decline|akceptuj/i.test(b.textContent || ""));
    if (decline) (decline as HTMLElement).click();
  }).catch(() => {});
  await page.waitForTimeout(500);

  const listing: { name: string; url: string }[] = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("li.product"));
    return items.map((item) => {
      const img = item.querySelector("img") as HTMLImageElement;
      const link = item.querySelector("a") as HTMLAnchorElement;
      return { name: img?.alt?.trim() || "", url: link?.href || "" };
    });
  });

  let fixed = 0;
  for (const targetName of STILL_BAD_NAMES) {
    // Fuzzy contains-match since exact DB name vs. site alt text can differ slightly.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-ząćęłńóśźż0-9]+/g, "");
    const match = listing.find(
      (l) => norm(l.name).includes(norm(targetName).slice(0, 20)) || norm(targetName).includes(norm(l.name).slice(0, 20)),
    );

    if (!match) {
      console.log(`❌ No listing match: ${targetName}`);
      continue;
    }

    try {
      await page.goto(match.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(700);
      const html = await page.content();
      const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripHtml(m[1]));
      const warningPara = paragraphs.find(
        (p) => WARNING_KEYWORDS.test(p) && p.length > 40 && !STORAGE_MARKER.test(p.trim()),
      );

      if (!warningPara) {
        console.log(`⚠️  No warning paragraph found on page for: ${targetName} (${match.url})`);
        continue;
      }

      const warnings = warningPara
        .split(/\.\s+(?=[A-ZŚŻŹĆŃŁÓĄĘ])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 15)
        .map((s) => (s.endsWith(".") ? s : `${s}.`));

      const product = await prisma.product.findFirst({ where: { namePl: targetName } });
      if (!product) {
        console.log(`❌ Not found in DB: ${targetName}`);
        continue;
      }

      await prisma.product.update({ where: { id: product.id }, data: { healthWarnings: warnings } });
      console.log(`✅ Fixed: ${targetName}`);
      fixed++;
    } catch (e) {
      console.log(`❌ Error for ${targetName}: ${(e as Error).message}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  await browser.close();
  console.log(`\n✅ Total fixed: ${fixed}/${STILL_BAD_NAMES.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

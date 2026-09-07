#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Anchors specific enough to never match the storage paragraph (which also
// mentions "dzieci" — "przechowywać ... poza zasięgiem dzieci" — so a generic
// "dzieci" keyword alone caused a real regression: 97/171 products got the
// storage sentence saved as their healthWarnings on the first pass).
const WARNING_KEYWORDS =
  /nadwrażliwości|substytut|zamiennik|zróżnicowanej diety|przekraczać.*porcj/i;
const STORAGE_MARKER = /^Przechowywa/i;

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

/** Real "Ostrzeżenia" paragraph, found by content not by position — the
 * naive "first <p> after </table>" approach grabbed the %RWS footnote
 * instead on pages where that footnote paragraph comes first. */
function extractRealWarnings(html: string): string[] | null {
  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripHtml(m[1]));
  const warningPara = paragraphs.find(
    (p) => WARNING_KEYWORDS.test(p) && p.length > 40 && !STORAGE_MARKER.test(p.trim()),
  );
  if (!warningPara) return null;

  return warningPara
    .split(/\.\s+(?=[A-ZŚŻŹĆŃŁÓĄĘ])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .map((s) => (s.endsWith(".") ? s : `${s}.`));
}

/** Split on sentence boundaries while ignoring Polish abbreviations (łac.,
 * np., itd., nr.) that would otherwise be mistaken for sentence ends. */
function splitSentences(text: string): string[] {
  const ABBREV = /(łac|np|itd|itp|nr|ul|Sp|zł|godz|tzw)\.$/i;
  const rough = text.split(/(?<=[.!?])\s+(?=[A-ZŚŻŹĆŃŁÓĄĘ])/);
  const merged: string[] = [];
  for (const part of rough) {
    if (merged.length > 0 && ABBREV.test(merged[merged.length - 1])) {
      merged[merged.length - 1] += ` ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged.map((s) => s.trim()).filter(Boolean);
}

function extractCleanBenefits(fullText: string): string[] {
  const plain = fullText.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const sentences = splitSentences(plain).filter((s) => s.length >= 30 && s.length <= 220);

  const actionSentences = sentences.filter((s) =>
    /wspiera|wspomaga|pomaga|przyczynia się|łagodzi|zwiększa|poprawia|reguluje|chroni|utrzymuje|wpływa/i.test(
      s,
    ),
  );

  const pool = actionSentences.length >= 2 ? actionSentences : sentences.length >= 2 ? sentences : [];
  return pool.slice(0, 5);
}

async function main() {
  console.log("🔧 Fixing healthWarnings (real disclaimer, not RWS footnote) and benefitsPl (clean sentences)...\n");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const urlMap = await scrapeListing(page);
  console.log(`✅ Found ${urlMap.size} URLs\n`);

  const allProducts = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, descriptionPl: true, healthWarnings: true, benefitsPl: true },
  });

  // Only re-touch products whose current value is still known-bad — avoids
  // re-scraping 171 pages when just re-running to catch stragglers.
  const isBadWarning = (w: unknown) => {
    const arr = (w as string[]) || [];
    return arr.length === 0 || arr.some((x) => /^Przechowywa/i.test(x.trim()) || /realizacji|RWS/i.test(x));
  };
  const isBadBenefit = (b: unknown) => {
    const arr = (b as string[]) || [];
    return arr.length === 0 || arr.every((x) => /wspiera zdrowie|naturalny skład/i.test(x));
  };
  const products = allProducts.filter(
    (p) => isBadWarning(p.healthWarnings) || isBadBenefit(p.benefitsPl),
  );
  console.log(`Products still needing a fix: ${products.length}/${allProducts.length}\n`);

  let warningsFixed = 0;
  let benefitsFixed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${products.length}... (warnings: ${warningsFixed}, benefits: ${benefitsFixed})`);
    }

    // benefitsPl can be derived from the already-clean descriptionPl in DB — no re-fetch needed.
    const plainDesc = (p.descriptionPl || "").replace(/<[^>]+>/g, " ");
    const benefits = extractCleanBenefits(plainDesc);
    const updates: any = {};
    if (benefits.length >= 2) {
      updates.benefitsPl = benefits;
      benefitsFixed++;
    }

    // healthWarnings needs a real page re-fetch (footnote-vs-warning distinction
    // isn't recoverable from what's already saved).
    const url = urlMap.get(p.namePl.toLowerCase().replace(/\s+/g, " ").trim());
    if (url) {
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(400);
        const html = await page.content();
        const warnings = extractRealWarnings(html);
        if (warnings && warnings.length > 0) {
          updates.healthWarnings = warnings;
          warningsFixed++;
        }
      } catch {
        // leave existing value
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.product.update({ where: { id: p.id }, data: updates });
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  await browser.close();

  console.log(`\n✅ healthWarnings fixed: ${warningsFixed}/${products.length}`);
  console.log(`✅ benefitsPl fixed: ${benefitsFixed}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

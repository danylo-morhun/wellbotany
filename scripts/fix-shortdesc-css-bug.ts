#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
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

async function scrapeShortDesc(page: any, url: string): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(500);
    const html = await page.content();

    const regex =
      /<div[^>]*class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const match = html.match(regex);
    if (match) {
      return match[1].trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("🔧 Fixing CSS-polluted short descriptions...\n");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("Getting real product URLs...");
  const urlMap = await scrapeListing(page);
  console.log(`✅ Found ${urlMap.size} URLs\n`);

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true },
  });

  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${products.length}... (fixed: ${fixed})`);

    const url = urlMap.get(p.namePl.toLowerCase().replace(/\s+/g, " ").trim());
    if (!url) {
      failed++;
      continue;
    }

    const shortDescHtml = await scrapeShortDesc(page, url);
    if (!shortDescHtml || shortDescHtml.length < 30) {
      failed++;
      continue;
    }

    const plainText = stripHtml(shortDescHtml);

    await prisma.product.update({
      where: { id: p.id },
      data: {
        shortDescPl: plainText.slice(0, 500),
        descriptionPl: shortDescHtml.startsWith("<p>") ? shortDescHtml : `<p>${plainText}</p>`,
        metaDescPl: plainText.slice(0, 300),
      },
    });

    fixed++;
    await new Promise((r) => setTimeout(r, 200));
  }

  await browser.close();

  console.log(`\n✅ Fixed: ${fixed}/${products.length}`);
  console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error).finally(() => process.exit(0));

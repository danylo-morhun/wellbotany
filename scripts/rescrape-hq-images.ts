#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import https from "https";
import fs from "fs";
import path from "path";

const DEST = path.join(process.cwd(), "public/supplier-images-hq");
if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

function toFullSize(thumbUrl: string): string {
  // Remove WordPress thumbnail suffix like "-250x250" before .jpg/.png
  return thumbUrl.replace(/-\d+x\d+(\.\w+)$/, "$1");
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const file = fs.createWriteStream(filepath);
      https
        .get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000 }, (res) => {
          if (res.statusCode !== 200) {
            file.destroy();
            fs.unlink(filepath, () => {});
            resolve(false);
            return;
          }
          res.pipe(file);
        })
        .on("error", () => {
          file.destroy();
          fs.unlink(filepath, () => {});
          resolve(false);
        });

      file.on("finish", () => {
        file.close();
        const size = fs.statSync(filepath).size;
        resolve(size > 20000); // full-size should be 100KB+, reject if too small
      });
    } catch {
      resolve(false);
    }
  });
}

interface ScrapedItem {
  name: string;
  imageUrl: string;
}

async function scrapeAllListings(): Promise<ScrapedItem[]> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results: ScrapedItem[] = [];

  for (let pageNum = 1; pageNum <= 30; pageNum++) {
    const url = pageNum === 1 ? "https://singularis.com.pl/sklep/" : `https://singularis.com.pl/sklep/page/${pageNum}/`;

    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => null);
    if (!resp || resp.status() === 404) break;

    await page.waitForTimeout(600);

    if (pageNum === 1) {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll("button"));
        const decline = btns.find((b) => /odrzuć|decline|akceptuj/i.test(b.textContent || ""));
        if (decline) (decline as HTMLElement).click();
      }).catch(() => {});
      await page.waitForTimeout(500);
    }

    const items: ScrapedItem[] = await page.evaluate(() => {
      const products = Array.from(document.querySelectorAll("li.product"));
      return products
        .map((item) => {
          const img = item.querySelector("img") as HTMLImageElement;
          const dataSrc = img?.getAttribute("data-src") || "";
          const realSrc = dataSrc || img?.src || "";
          return {
            name: img?.alt?.trim() || "",
            imageUrl: realSrc.startsWith("data:") ? "" : realSrc,
          };
        })
        .filter((x) => x.name && x.imageUrl);
    });

    if (items.length === 0) break;

    results.push(...items);
    console.log(`  Page ${pageNum}: ${items.length} products (total: ${results.length})`);
  }

  await browser.close();
  return results;
}

async function main() {
  console.log("🔍 Scraping listing pages for name+image pairs...\n");

  const scraped = await scrapeAllListings();
  console.log(`\n✅ Scraped ${scraped.length} name/image pairs\n`);

  // Build lookup map (normalize names for matching)
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const imageByName = new Map<string, string>();
  for (const item of scraped) {
    imageByName.set(normalize(item.name), toFullSize(item.imageUrl));
  }

  console.log("📥 Downloading HQ images and fixing DB links...\n");

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true }
  });

  let fixed = 0;
  let notFound = 0;
  let downloadFailed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${products.length}... (fixed: ${fixed})`);

    const imageUrl = imageByName.get(normalize(p.namePl));

    if (!imageUrl) {
      notFound++;
      continue;
    }

    const filename = `${p.id}.jpg`;
    const filepath = path.join(DEST, filename);

    const downloaded = await downloadImage(imageUrl, filepath);
    if (!downloaded) {
      downloadFailed++;
      continue;
    }

    let finalUrl = `/supplier-images-hq/${filename}`;
    if (blobToken) {
      try {
        const buffer = fs.readFileSync(filepath);
        const blob = await put(`singularis-hq/${filename}`, buffer, {
          access: "public",
          token: blobToken,
          allowOverwrite: true
        });
        finalUrl = blob.url;
      } catch {
        // keep local fallback
      }
    }

    // Remove old (wrong/low-quality) images for this product
    await prisma.productImage.deleteMany({ where: { productId: p.id } });

    // Create new correct HQ image
    await prisma.productImage.create({
      data: {
        productId: p.id,
        url: finalUrl,
        altPl: p.namePl,
        isMain: true,
        sortOrder: 0
      }
    });

    fixed++;
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n✅ Fixed with HQ images: ${fixed}/${products.length}`);
  console.log(`⚠️  Not found in listing: ${notFound}`);
  console.log(`❌ Download failed: ${downloadFailed}`);
}

main().catch(console.error).finally(() => process.exit(0));

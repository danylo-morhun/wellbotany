#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import https from "https";
import fs from "fs";
import path from "path";

const DEST = path.join(process.cwd(), "public/supplier-images");

async function downloadFile(url: string, dest: string): Promise<boolean> {
  return new Promise((res) => {
    try {
      const file = fs.createWriteStream(dest);
      const req = https.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" } }, (r) => {
        if (r.statusCode !== 200) {
          file.destroy();
          fs.unlinkSync(dest).catch(() => {});
          res(false);
          return;
        }
        r.pipe(file);
      });

      req.on("error", () => {
        file.destroy();
        fs.unlinkSync(dest).catch(() => {});
        res(false);
      });

      file.on("finish", () => {
        file.close();
        const size = fs.statSync(dest).size;
        if (size > 10000) {
          res(true);
        } else {
          fs.unlinkSync(dest).catch(() => {});
          res(false);
        }
      });

      file.on("error", () => {
        fs.unlinkSync(dest).catch(() => {});
        res(false);
      });
    } catch {
      res(false);
    }
  });
}

async function main() {
  console.log("🖼️ Singularis картинки (browser + direct CDN)...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, images: { select: { url: true } } }
  });

  const browser = await chromium.launch();
  let done = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${products.length}...`);

    // Skip if already have image
    if (p.images.length > 0) continue;

    try {
      const page = await browser.newPage();
      const slug = p.namePl.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const url = `https://singularis.com.pl/sklep/${slug}/`;

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);

      // Extract image URL from page
      const imageUrl: string | null = await page.evaluate(() => {
        const img = document.querySelector("img.wp-post-image") ||
                    document.querySelector(".woocommerce-product-gallery img") ||
                    document.querySelector("img[data-src]");
        return (img as any)?.src || (img as any)?.dataset.src || null;
      });

      await page.close();

      if (imageUrl) {
        const filename = `s-${i}.jpg`;
        const filepath = path.join(DEST, filename);

        const success = await downloadFile(imageUrl, filepath);

        if (success) {
          await prisma.productImage.create({
            data: {
              productId: p.id,
              url: `/supplier-images/${filename}`,
              altPl: p.namePl,
              isMain: true,
              sortOrder: 0
            }
          }).catch(() => {});
          done++;
        }
      }

      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      // continue
    }
  }

  await browser.close();

  console.log(`\n✅ Завантажено: ${done}`);

  const withImg = await prisma.product.count({
    where: { brand: { slug: "singularis" }, images: { some: {} } }
  });

  console.log(`✅ Усього з картинками: ${withImg}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

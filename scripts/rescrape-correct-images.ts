#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const DEST = path.join(process.cwd(), "public/supplier-images-v2");

if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

function slugifyForUrl(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics
    .replace(/[®™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const https = require("https");
      const file = fs.createWriteStream(filepath);

      https
        .get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 15000 }, (res: any) => {
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
        resolve(size > 3000);
      });
    } catch {
      resolve(false);
    }
  });
}

async function main() {
  console.log("🔄 Re-scraping CORRECT images per product ID...\n");

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true, images: { select: { id: true } } }
  });

  console.log(`Products to process: ${products.length}\n`);

  const browser = await chromium.launch();
  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${products.length}... (fixed: ${fixed}, failed: ${failed})`);

    try {
      const slug = slugifyForUrl(p.namePl);
      const productUrl = `https://singularis.com.pl/produkt/${slug}/`;

      const page = await browser.newPage();
      const resp = await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => null);

      if (!resp || resp.status() === 404) {
        // Try alternate URL pattern
        const altUrl = `https://singularis.com.pl/sklep/${slug}/`;
        await page.goto(altUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
      }

      await page.waitForTimeout(800);

      const imageUrl: string | null = await page.evaluate(() => {
        const selectors = [
          "img.wp-post-image",
          ".woocommerce-product-gallery__image img",
          ".woocommerce-product-gallery img",
          "img[data-large_image]",
        ];
        for (const sel of selectors) {
          const img = document.querySelector(sel) as HTMLImageElement;
          if (img) {
            return img.getAttribute("data-large_image") || img.src || img.getAttribute("data-src");
          }
        }
        return null;
      });

      await page.close();

      if (!imageUrl) {
        failed++;
        continue;
      }

      const filename = `${p.id}.jpg`;
      const filepath = path.join(DEST, filename);

      const downloaded = await downloadImage(imageUrl, filepath);

      if (!downloaded) {
        failed++;
        continue;
      }

      // Upload to Blob if token available
      let finalUrl = `/supplier-images-v2/${filename}`;
      if (blobToken) {
        try {
          const buffer = fs.readFileSync(filepath);
          const blob = await put(`singularis-v2/${filename}`, buffer, {
            access: "public",
            token: blobToken,
            allowOverwrite: true
          });
          finalUrl = blob.url;
        } catch (e) {
          // fall back to local path
        }
      }

      // Delete old wrong images
      if (p.images.length > 0) {
        await prisma.productImage.deleteMany({
          where: { productId: p.id }
        });
      }

      // Create new correct image
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
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      failed++;
    }
  }

  await browser.close();

  console.log(`\n✅ Fixed: ${fixed}/${products.length}`);
  console.log(`❌ Failed: ${failed}/${products.length}`);
}

main().catch(console.error).finally(() => process.exit(0));

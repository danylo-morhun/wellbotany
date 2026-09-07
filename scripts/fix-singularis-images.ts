#!/usr/bin/env npx tsx
import { chromium } from "playwright";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DEST_DIR = path.join(process.cwd(), "public/supplier-images");

async function downloadImageFile(
  url: string,
  filename: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const protocol = url.startsWith("https") ? require("https") : require("http");
      const filePath = path.join(DEST_DIR, filename);

      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 5000) {
        resolve(`/supplier-images/${filename}`);
        return;
      }

      const file = fs.createWriteStream(filePath);
      let receivedBytes = 0;

      protocol
        .get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }, (res: any) => {
          if (res.statusCode !== 200) {
            file.destroy();
            fs.unlink(filePath, () => {});
            resolve(null);
            return;
          }

          res.on("data", (chunk: Buffer) => {
            receivedBytes += chunk.length;
          });

          res.pipe(file);
        })
        .on("error", () => {
          file.destroy();
          fs.unlink(filePath, () => {});
          resolve(null);
        });

      file.on("finish", () => {
        file.close();
        if (receivedBytes > 5000) {
          resolve(`/supplier-images/${filename}`);
        } else {
          fs.unlink(filePath, () => {});
          resolve(null);
        }
      });

      file.on("error", () => {
        fs.unlink(filePath, () => {});
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

async function main() {
  console.log("🖼️  Завантаження картинок Singularis через Playwright...\n");

  const products = await prisma.product.findMany({
    where: { brand: { slug: "singularis" } },
    select: { id: true, namePl: true },
  });

  const browser = await chromium.launch();
  let downloaded = 0;
  let linked = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];

    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${products.length}...`);

    try {
      const page = await browser.newPage();
      const productUrl = `https://singularis.com.pl/sklep/${p.namePl
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}/`;

      await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(
        () => {},
      );
      await page.waitForTimeout(1000);

      const imageUrl: string | null = await page.evaluate(() => {
        const img = document.querySelector("img.wp-post-image, .woocommerce-product-gallery img");
        return (img as any)?.src || (img as any)?.dataset.src || null;
      });

      await page.close();

      if (imageUrl) {
        const filename = `singularis-${i}.jpg`;
        const saved = await downloadImageFile(imageUrl, filename);

        if (saved) {
          downloaded++;

          // Link to product
          const existing = await prisma.productImage.findFirst({
            where: { productId: p.id, url: saved },
          });

          if (!existing) {
            await prisma.productImage.create({
              data: {
                productId: p.id,
                url: saved,
                altPl: p.namePl,
                isMain: true,
                sortOrder: 0,
              },
            });
            linked++;
          }
        }
      }

      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      // continue
    }
  }

  await browser.close();

  console.log(`\n✅ Завантажено: ${downloaded}`);
  console.log(`✅ Пов'язано: ${linked}`);

  const withImages = await prisma.product.count({
    where: { brand: { slug: "singularis" }, images: { some: {} } },
  });

  console.log(`\nУсього з картинками: ${withImages}/171`);
}

main().catch(console.error).finally(() => process.exit(0));

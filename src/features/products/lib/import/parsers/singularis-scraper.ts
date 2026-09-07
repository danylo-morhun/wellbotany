import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { parsePriceToGrosz } from "../price";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

const DEST_DIR = path.join(process.cwd(), "public/supplier-images");

async function downloadImageAsync(url: string, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const filePath = path.join(DEST_DIR, filename);

      if (fs.existsSync(filePath)) {
        resolve(true);
        return;
      }

      const protocol = url.startsWith("https") ? require("https") : require("http");
      const file = fs.createWriteStream(filePath);

      protocol
        .get(url, { timeout: 10000 }, (res: any) => {
          if (res.statusCode !== 200) {
            file.destroy();
            fs.unlink(filePath, () => {});
            resolve(false);
            return;
          }
          res.pipe(file);
        })
        .on("error", () => {
          file.destroy();
          fs.unlink(filePath, () => {});
          resolve(false);
        });

      file.on("finish", () => {
        file.close();
        resolve(true);
      });

      file.on("error", () => {
        fs.unlink(filePath, () => {});
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

interface RawProduct {
  name: string;
  price: string;
  imageUrl?: string;
  categoryName?: string;
  link?: string;
}

export async function scrapeSingularis(
  source: SupplierSource,
): Promise<SupplierProductDraft[]> {
  fs.mkdirSync(DEST_DIR, { recursive: true });

  const browser = await chromium.launch();
  const products: RawProduct[] = [];
  let pageNum = 1;
  let hasMore = true;

  console.log("Starting Singularis scrape...");

  while (hasMore) {
    const url =
      pageNum === 1 ? "https://singularis.com.pl/sklep/" : `https://singularis.com.pl/sklep/page/${pageNum}/`;

    console.log(`Scraping page ${pageNum}...`);
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000); // Let JS render

    const pageProducts = await page.evaluate(() => {
      const items: RawProduct[] = [];

      // Try WooCommerce selectors first, then fallback to generic ones
      let productElements = document.querySelectorAll("li.product");
      if (productElements.length === 0) {
        productElements = document.querySelectorAll("[data-product-id]");
      }
      if (productElements.length === 0) {
        productElements = document.querySelectorAll(".product-card, .product-item, .product");
      }

      productElements.forEach((el) => {
        // Name
        let nameEl = el.querySelector("h2 a, .product-name a, .product-title a, h3 a");
        if (!nameEl) nameEl = el.querySelector("h2, h3, .product-name, .product-title");
        const name = nameEl?.textContent?.trim()?.replace(/\n/g, " ").substring(0, 200);

        // Price
        let priceEl = el.querySelector(".price, .product-price, .woocommerce-Price-amount");
        if (!priceEl) priceEl = el.querySelector(".amount, [data-price]");
        const price = priceEl?.textContent?.trim();

        // Image
        let imageEl = el.querySelector("img");
        let imageUrl = (imageEl as HTMLImageElement)?.src || (imageEl as HTMLImageElement)?.dataset.src;
        if (imageUrl && imageUrl.includes("placeholder")) imageUrl = undefined;

        if (name && price) {
          items.push({
            name,
            price,
            imageUrl,
          });
        }
      });

      return items;
    });

    products.push(...pageProducts);
    console.log(`  Found ${pageProducts.length} products on page ${pageNum}`);

    // Check if there's a next page
    const hasNextPage = await page.evaluate(() => {
      const nextBtn = document.querySelector("a.next, .next-page, a[rel='next']");
      return !!nextBtn;
    });

    await page.close();

    if (!hasNextPage || pageProducts.length === 0) {
      hasMore = false;
    } else {
      pageNum++;
    }

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await browser.close();

  console.log(`\nTotal products scraped: ${products.length}`);
  console.log("Downloading images...");

  // Download images in parallel batches
  const downloadBatch = async (batch: RawProduct[]) => {
    await Promise.all(
      batch.map(async (product) => {
        if (product.imageUrl) {
          const filename = `singularis-${product.name.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}-${Math.random().toString(36).slice(7)}.jpg`;
          await downloadImageAsync(product.imageUrl, filename);
        }
      }),
    );
  };

  const batchSize = 5;
  for (let i = 0; i < products.length; i += batchSize) {
    await downloadBatch(products.slice(i, i + batchSize));
  }

  console.log("Converting to SupplierProductDraft format...");

  const drafts: SupplierProductDraft[] = products
    .map((product, idx) => {
      const priceGrosz = parsePriceToGrosz(product.price);
      if (!priceGrosz) return null;

      const imageFilename = `singularis-${product.name.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}-${idx}.jpg`;
      const imageUrl = fs.existsSync(path.join(DEST_DIR, imageFilename))
        ? `/supplier-images/${imageFilename}`
        : undefined;

      // Unique SKU per product: brand-name-index
      const sku = `SINGULARIS-${idx}`;

      return {
        sourceId: source.id,
        externalKey: product.name,
        name: product.name,
        brandName: source.brandName,
        categoryName: product.categoryName,
        sku, // Force unique SKU
        priceGrosz,
        vatRate: source.defaultVatRate,
        stock: 99, // Default stock, user can adjust
        imageUrl,
      };
    })
    .filter((p) => p !== null) as SupplierProductDraft[];

  console.log(`Converted ${drafts.length} products to import format`);
  return drafts;
}

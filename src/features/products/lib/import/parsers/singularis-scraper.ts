import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { parsePriceToGrosz } from "../price";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

const DEST_DIR = path.join(process.cwd(), "public/supplier-images");

async function downloadImageAsync(url: string, filename: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    try {
      const filePath = path.join(DEST_DIR, filename);

      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
        resolve(`/supplier-images/${filename}`);
        return;
      }

      const protocol = url.startsWith("https") ? require("https") : require("http");
      const file = fs.createWriteStream(filePath);

      protocol
        .get(url, { timeout: 10000 }, (res: any) => {
          if (res.statusCode !== 200) {
            file.destroy();
            fs.unlink(filePath, () => {});
            resolve(undefined);
            return;
          }
          res.pipe(file);
        })
        .on("error", () => {
          file.destroy();
          fs.unlink(filePath, () => {});
          resolve(undefined);
        });

      file.on("finish", () => {
        file.close();
        resolve(`/supplier-images/${filename}`);
      });

      file.on("error", () => {
        fs.unlink(filePath, () => {});
        resolve(undefined);
      });
    } catch {
      resolve(undefined);
    }
  });
}

interface ProductCardData {
  name: string;
  price: string;
  url: string;
  imageUrl?: string;
}

interface ProductDetails {
  descriptionPl?: string;
  shortDescPl?: string;
  categoryName?: string;
  ingredientsPl?: string;
  netWeight?: string;
  servingSize?: string;
}

async function scrapeProductDetails(page: any, productUrl: string): Promise<ProductDetails> {
  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    const details: ProductDetails = await page.evaluate(() => {
      const data: ProductDetails = {};

      // Get full description with HTML structure
      const mainContent = document.querySelector(".woocommerce-product-details");
      if (!mainContent) {
        // Fallback: get from various possible locations
        const descEl = document.querySelector(
          ".woocommerce-product-details__short-description, .product-description, .entry-content",
        );
        if (descEl) {
          const html = descEl.innerHTML;
          if (html) {
            data.descriptionPl = html.trim();
            // Short version: just text
            data.shortDescPl = descEl.textContent?.trim().slice(0, 250);
          }
        }
      } else {
        // Extract HTML content for rich formatting
        const descSection = mainContent.querySelector(".product-short-description, .description");
        if (descSection) {
          data.descriptionPl = descSection.innerHTML.trim().slice(0, 5000);
          data.shortDescPl = descSection.textContent?.trim().slice(0, 250);
        }
      }

      // Category from breadcrumb
      const breadcrumb = document.querySelector(".woocommerce-breadcrumb");
      if (breadcrumb) {
        const parts = Array.from(breadcrumb.querySelectorAll("a"))
          .map((a) => a.textContent?.trim())
          .filter(Boolean);
        if (parts.length > 0) {
          data.categoryName = parts[parts.length - 1];
        }
      }

      // Attributes table for packaging, weight
      const attrTable = document.querySelector(".woocommerce-product-attributes");
      if (attrTable) {
        const rows = attrTable.querySelectorAll("tr");
        rows.forEach((row) => {
          const th = row.querySelector("th");
          const td = row.querySelector("td");
          const label = th?.textContent?.toLowerCase().trim() || "";
          const value = td?.textContent?.trim() || "";

          if (label.includes("waga") || label.includes("pojemno") || label.includes("opakowanie")) {
            data.netWeight = value;
          }
          if (label.includes("porcja") || label.includes("dziennie") || label.includes("serving")) {
            data.servingSize = value;
          }
        });
      }

      // Extract all text content for ingredients/nutrition
      const allText = document.body.innerText;
      if (allText.includes("składniki")) {
        const idx = allText.toLowerCase().indexOf("składniki");
        const section = allText.slice(idx, idx + 1500);
        if (section.length > 30) {
          data.ingredientsPl = section;
        }
      }

      return data;
    });

    return details;
  } catch (error) {
    return {};
  }
}

export async function scrapeSingularis(source: SupplierSource): Promise<SupplierProductDraft[]> {
  fs.mkdirSync(DEST_DIR, { recursive: true });

  const browser = await chromium.launch();
  const productUrls: ProductCardData[] = [];

  let pageNum = 1;
  let hasMore = true;

  console.log("Step 1: Collecting product URLs...");

  // Scrape listing pages to get all product URLs
  while (hasMore) {
    const url =
      pageNum === 1 ? "https://singularis.com.pl/sklep/" : `https://singularis.com.pl/sklep/page/${pageNum}/`;

    console.log(`  Listing page ${pageNum}...`);
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Close cookie banner if present
    try {
      await page.evaluate(() => {
        const cookie = document.getElementById("CybotCookiebotDialogBodyButtonDecline");
        if (cookie) cookie.click();
      });
      await page.waitForTimeout(500);
    } catch {}

    // Wait for products to load
    try {
      await page.waitForSelector("li.product", { timeout: 10000 });
    } catch {
      console.log(`    ⚠ Timeout waiting for products on page ${pageNum}`);
    }

    await page.waitForTimeout(1000);

    const pageProducts = await page.evaluate(() => {
      const items: ProductCardData[] = [];
      document.querySelectorAll("li.product").forEach((el) => {
        // Name is in image alt attribute
        const imgEl = el.querySelector("img");
        const priceEl = el.querySelector(".price");
        const linkEl = el.querySelector("a[href*='/sklep/']");

        const name = (imgEl as HTMLImageElement)?.alt?.trim();
        const price = priceEl?.textContent?.trim();
        const url = (linkEl as HTMLAnchorElement)?.href;
        const imageUrl = (imgEl as HTMLImageElement)?.src || (imgEl as HTMLImageElement)?.dataset.src;

        if (name && price && url) {
          items.push({ name, price, url, imageUrl });
        }
      });
      return items;
    });

    productUrls.push(...pageProducts);
    console.log(`    Found ${pageProducts.length} products`);

    await page.close();

    // Continue if we found products on this page
    if (pageProducts.length > 0) {
      pageNum++;
    } else {
      hasMore = false;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\nStep 2: Scraping ${productUrls.length} product detail pages...`);

  const allProducts: SupplierProductDraft[] = [];

  for (let i = 0; i < productUrls.length; i++) {
    const product = productUrls[i];

    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${productUrls.length}...`);

    const page = await browser.newPage();
    const details = await scrapeProductDetails(page, product.url);

    let imageUrl: string | undefined;
    if (product.imageUrl) {
      const filename = `singularis-${i}.jpg`;
      imageUrl = await downloadImageAsync(product.imageUrl, filename);
    }

    await page.close();

    const priceGrosz = parsePriceToGrosz(product.price);
    if (!priceGrosz) continue;

    allProducts.push({
      sourceId: source.id,
      externalKey: product.name,
      name: product.name,
      brandName: source.brandName,
      categoryName: details.categoryName,
      sku: `SINGULARIS-${i}`,
      priceGrosz,
      vatRate: source.defaultVatRate,
      stock: 99,
      imageUrl,
      descriptionPl: details.descriptionPl,
      shortDescPl: details.shortDescPl,
      ingredientsPl: details.ingredientsPl,
      packaging: details.netWeight,
      servingSize: details.servingSize,
    });

    await new Promise((r) => setTimeout(r, 300));
  }

  await browser.close();

  console.log(`\n✅ Scraped ${allProducts.length} products with full details`);
  return allProducts;
}

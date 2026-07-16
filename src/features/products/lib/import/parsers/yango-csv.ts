import fs from "node:fs";
import { parsePriceToGrosz } from "../price";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ";" && !inQuotes) {
      fields.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  fields.push(current.trim());
  return fields;
}

export function parseYangoCsv(filePath: string, source: SupplierSource): SupplierProductDraft[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const col = (name: string) =>
    header.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

  const nameIdx = col("nazwa");
  const skuIdx = col("indeks");
  const categoryIdx = col("kategoria");
  const netPriceIdx = col("netto");
  const grossPriceIdx = col("brutto");
  const stockIdx = col("ilość");
  const imageIdx = col("obraz");

  const products: SupplierProductDraft[] = [];

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const name = cells[nameIdx]?.replace(/^"|"$/g, "").trim();
    if (!name) continue;

    const sku = cells[skuIdx]?.replace(/^"|"$/g, "").trim() || undefined;
    const categoryName = cells[categoryIdx]?.replace(/^"|"$/g, "").trim() || undefined;
    const imageUrl = cells[imageIdx]?.replace(/^"|"$/g, "").trim() || undefined;
    const stock = Number.parseInt(cells[stockIdx] ?? "0", 10) || 0;

    const priceGrosz =
      parsePriceToGrosz(cells[grossPriceIdx]) ?? parsePriceToGrosz(cells[netPriceIdx]) ?? null;
    if (!priceGrosz) continue;

    const externalKey = sku ?? name;

    products.push({
      sourceId: source.id,
      externalKey,
      name,
      brandName: source.brandName,
      categoryName,
      sku,
      priceGrosz,
      costPriceGrosz: parsePriceToGrosz(cells[netPriceIdx]) ?? undefined,
      vatRate: source.defaultVatRate,
      stock,
      imageUrl,
    });
  }

  return products;
}

import fs from "node:fs";
import * as XLSX from "xlsx";
import { parsePriceToGrosz } from "../price";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

function cellValue(row: unknown[], index: number): string {
  const value = row[index];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function parsePureHydrationXlsx(
  filePath: string,
  source: SupplierSource,
): SupplierProductDraft[] {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const products: SupplierProductDraft[] = [];
  let currentSection = source.brandName;

  for (const row of rows) {
    if (!Array.isArray(row)) continue;

    const colB = cellValue(row, 1);
    const colC = cellValue(row, 2);
    const internetPrice = cellValue(row, 8);

    // Section header row (e.g. "PUDE HYDRATION") — no EAN in column C
    if (colB && !colC && colB.length > 3 && !colB.toLowerCase().includes("nazwa")) {
      currentSection = colB;
      continue;
    }

    const name = colB;
    const ean = colC.replace(/\D/g, "");
    if (!name || !ean) continue;

    const priceGrosz = parsePriceToGrosz(internetPrice) ?? parsePriceToGrosz(cellValue(row, 3));
    if (!priceGrosz) continue;

    products.push({
      sourceId: source.id,
      externalKey: ean,
      name,
      brandName: source.brandName,
      categoryName: currentSection,
      ean,
      sku: ean,
      priceGrosz,
      costPriceGrosz: parsePriceToGrosz(cellValue(row, 4)) ?? undefined,
      vatRate: source.defaultVatRate,
      stock: 0,
    });
  }

  return products;
}

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

export function parseMitopharmaXlsx(
  filePath: string,
  source: SupplierSource,
): SupplierProductDraft[] {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const products: SupplierProductDraft[] = [];

  for (const row of rows) {
    if (!Array.isArray(row)) continue;

    const name = cellValue(row, 0);
    const ean = cellValue(row, 1).replace(/\D/g, "");
    const vatRaw = cellValue(row, 2);
    const costNet = cellValue(row, 3);
    const suggestedRetail = cellValue(row, 9);

    if (!name || !ean) continue;

    const priceGrosz = parsePriceToGrosz(suggestedRetail);
    if (!priceGrosz) continue;

    products.push({
      sourceId: source.id,
      externalKey: ean,
      name,
      brandName: source.brandName,
      ean,
      sku: ean,
      priceGrosz,
      costPriceGrosz: parsePriceToGrosz(costNet) ?? undefined,
      vatRate: Number.parseFloat(vatRaw.replace(",", ".")) || source.defaultVatRate,
      stock: 0,
    });
  }

  return products;
}

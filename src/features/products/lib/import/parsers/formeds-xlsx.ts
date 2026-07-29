import fs from "node:fs";
import * as XLSX from "xlsx";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

function cellValue(row: unknown[], index: number): string {
  const value = row[index];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

// Formeds catalog has no pricing — descriptions only. Products import as
// drafts with priceGrosz 0 (importSupplierProducts marks them inactive)
// until a real price list is supplied.
export function parseFormedsXlsx(filePath: string, source: SupplierSource): SupplierProductDraft[] {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const products: SupplierProductDraft[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

    for (const row of rows) {
      if (!Array.isArray(row)) continue;

      const name = cellValue(row, 1);
      const netWeight = cellValue(row, 12);
      const ean = cellValue(row, 14).replace(/\D/g, "");

      if (!name || name.toLowerCase().includes("nazwa produktu")) continue;
      if (!ean) continue;

      products.push({
        sourceId: source.id,
        externalKey: ean,
        name,
        brandName: source.brandName,
        categoryName: sheetName,
        packaging: netWeight || undefined,
        ean,
        sku: ean,
        priceGrosz: 0,
        vatRate: source.defaultVatRate,
        stock: 0,
      });
    }
  }

  return products;
}

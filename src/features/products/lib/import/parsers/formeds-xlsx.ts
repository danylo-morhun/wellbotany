import fs from "node:fs";
import * as XLSX from "xlsx";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

function cellValue(row: unknown[], index: number): string {
  const value = row[index];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

// Cells like "sposób spożycia:\nSpożywać..." repeat their own column label
// inline — strip it since the destination field is already labeled by name.
function stripInlineLabel(value: string): string {
  return value.replace(/^[a-ząćęłńóśźż \d()]+:\s*\n?/i, "").trim();
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
      const shortDescPl = cellValue(row, 2);
      const opisProduktu = cellValue(row, 4);
      const dzialanie = cellValue(row, 5);
      const sposobSpozycia = cellValue(row, 8);
      const srodkiOstroznosci = cellValue(row, 9);
      const warunkiPrzechowywania = cellValue(row, 10);
      const netWeight = cellValue(row, 12);
      const iloscPorcji = cellValue(row, 13);
      const ean = cellValue(row, 14).replace(/\D/g, "");
      const skladniki = cellValue(row, 7);

      if (!name || name.toLowerCase().includes("nazwa produktu")) continue;
      if (!ean) continue;

      // Some sheets shift this column, which can leak a 13-digit EAN in here —
      // guard against anything past a sane serving count before trusting it.
      const parsedServings = Number.parseInt(iloscPorcji, 10);
      const servingsPerContainer =
        Number.isFinite(parsedServings) && parsedServings > 0 && parsedServings <= 1000
          ? parsedServings
          : undefined;

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
        shortDescPl: shortDescPl || undefined,
        descriptionPl: [opisProduktu, dzialanie].filter(Boolean).join("\n\n") || undefined,
        ingredientsPl: skladniki || undefined,
        nutritionFactsPl: cellValue(row, 6) || undefined,
        healthWarningsPl: srodkiOstroznosci ? stripInlineLabel(srodkiOstroznosci) : undefined,
        servingSize: sposobSpozycia ? stripInlineLabel(sposobSpozycia) : undefined,
        servingsPerContainer,
        storageInfo: warunkiPrzechowywania ? stripInlineLabel(warunkiPrzechowywania) : undefined,
      });
    }
  }

  return products;
}

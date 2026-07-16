import fs from "node:fs";
import * as XLSX from "xlsx";
import { parsePriceToGrosz, parseVatRate } from "../price";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

function cellValue(row: unknown[], index: number): string {
  const value = row[index];
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function parseKenayXlsx(filePath: string, source: SupplierSource): SupplierProductDraft[] {
  const workbook = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });

  const products: SupplierProductDraft[] = [];

  for (const row of rows) {
    if (!Array.isArray(row)) continue;

    const lp = cellValue(row, 0);
    const name = cellValue(row, 1);
    const packaging = cellValue(row, 2);
    const retailNet = cellValue(row, 3);
    const wholesaleNet = cellValue(row, 4);
    const suggestedGross = cellValue(row, 6);
    const vatRaw = cellValue(row, 7);
    const ean = cellValue(row, 8).replace(/\D/g, "");
    const imageUrl = cellValue(row, 10);

    if (!name || name.toLowerCase().includes("kenay")) continue;
    if (!/^\d+$/.test(lp) && !ean) continue;

    const priceGrosz = parsePriceToGrosz(suggestedGross) ?? parsePriceToGrosz(retailNet) ?? null;
    if (!priceGrosz) continue;

    const fullName = packaging ? `${name} – ${packaging}` : name;
    const externalKey = ean || `${lp}-${name}`;

    products.push({
      sourceId: source.id,
      externalKey,
      name: fullName,
      brandName: source.brandName,
      packaging: packaging || undefined,
      ean: ean || undefined,
      sku: ean || `KENAY-${lp}`,
      priceGrosz,
      costPriceGrosz: parsePriceToGrosz(wholesaleNet) ?? undefined,
      vatRate: parseVatRate(vatRaw, source.defaultVatRate),
      stock: 0,
      imageUrl: imageUrl.startsWith("http") ? imageUrl : undefined,
    });
  }

  return products;
}

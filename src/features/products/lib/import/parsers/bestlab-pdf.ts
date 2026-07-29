import fs from "node:fs";
import { parsePriceToGrosz } from "../price";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

// Columns are tab-separated: "<lp> <name>\t<ean> <packaging>\t<vat>%\t
// <srp brutto>) zł\t<srp netto>) zł\t<discount>%\t<cena zakupu netto> zł (\t
// <sugerowana cena>) zł)". A handful of long names wrap onto a second
// physical line before the first tab — those get folded back in below.
function joinWrappedRows(text: string): string[] {
  const rows: string[] = [];
  let buffer = "";

  for (const line of text.split(/\r?\n/)) {
    const startsNewRow = /^\d+\s/.test(line.trim());
    if (startsNewRow) {
      if (buffer) rows.push(buffer);
      buffer = line;
    } else if (buffer) {
      buffer += ` ${line}`;
    }
  }
  if (buffer) rows.push(buffer);

  return rows;
}

function stripPricePunctuation(value: string): string {
  return value.replace(/[)(]/g, "").replace(/zł/gi, "").trim();
}

export async function parseBestlabPdf(
  filePath: string,
  source: SupplierSource,
): Promise<SupplierProductDraft[]> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  const products: SupplierProductDraft[] = [];

  for (const rawRow of joinWrappedRows(result.text)) {
    // One row in the source PDF is missing the tab before its EAN — insert
    // it back whenever a 13-digit run isn't already tab-separated.
    const row = rawRow.replace(/([^\t])(\d{13})\b/, "$1\t$2");
    const fields = row.split("\t").map((f) => f.trim());
    if (fields.length < 8) continue;

    const [lpName, eanPackaging, vatRaw, , , , costRaw, retailRaw] = fields;

    const name = lpName.replace(/^\d+\s*/, "").trim();
    const eanMatch = eanPackaging.match(/^(\d{13})\s*(.*)$/);
    if (!name || !eanMatch) continue;

    const ean = eanMatch[1];
    const packaging = eanMatch[2].trim();
    const vatRate = Number.parseFloat(vatRaw) || source.defaultVatRate;

    const priceGrosz = parsePriceToGrosz(stripPricePunctuation(retailRaw));
    if (!priceGrosz) continue;

    products.push({
      sourceId: source.id,
      externalKey: ean,
      name,
      brandName: source.brandName,
      packaging: packaging || undefined,
      ean,
      sku: ean,
      priceGrosz,
      costPriceGrosz: parsePriceToGrosz(stripPricePunctuation(costRaw)) ?? undefined,
      vatRate,
      stock: 0,
    });
  }

  return products;
}

import fs from "node:fs";
import { slugify } from "@/lib/slugify";
import type { SupplierSource } from "../sources";
import type { SupplierProductDraft } from "../types";

type ManifestEntry = {
  name: string;
  ean: string | null;
  category: string;
};

// HealthLabs Care drop had only per-product Word docs and photos, no price
// list or EAN sheet for supplements — this manifest was hand-derived from
// the folder/file names. Products import as drafts with priceGrosz 0
// (importSupplierProducts marks them inactive) until real pricing arrives.
export function parseHealthlabsManifest(
  filePath: string,
  source: SupplierSource,
): SupplierProductDraft[] {
  const entries = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ManifestEntry[];

  return entries.map((entry) => {
    const ean = entry.ean ?? undefined;
    const externalKey = ean ?? slugify(entry.name);
    return {
      sourceId: source.id,
      externalKey,
      name: entry.name,
      brandName: source.brandName,
      categoryName: entry.category,
      ean,
      sku: ean ?? `HLC-${slugify(entry.name)}`,
      priceGrosz: 0,
      vatRate: source.defaultVatRate,
      stock: 0,
    } satisfies SupplierProductDraft;
  });
}

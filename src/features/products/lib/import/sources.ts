export type SupplierFileFormat = "yango-csv" | "kenay-xlsx" | "pure-hydration-xlsx";

export type SupplierSource =
  | {
      kind: "file";
      id: string;
      label: string;
      brandName: string;
      brandSlug: string;
      /** Path relative to project root */
      filePath: string;
      format: SupplierFileFormat;
      defaultVatRate: number;
    }
  | {
      kind: "api";
      id: string;
      label: string;
      /**
       * For API sources, brand is often per-product; leave this as a fallback.
       * (Importer uses per-row brand when available.)
       */
      brandName: string;
      brandSlug: string;
      format: "shoper-api";
      defaultVatRate: number;
    };

/**
 * Supplier price lists and catalogs.
 * Place files in project root or `data/suppliers/` and update paths below.
 */
export const SUPPLIER_SOURCES: SupplierSource[] = [
  {
    kind: "file",
    id: "yango",
    label: "Yango B2B",
    brandName: "Yango",
    brandSlug: "yango",
    filePath: "product_2026-06-30_092037.csv",
    format: "yango-csv",
    defaultVatRate: 8,
  },
  {
    kind: "file",
    id: "kenay",
    label: "Kenay 2026",
    brandName: "Kenay",
    brandSlug: "kenay",
    filePath: "Cennik KENAY 2026+pack..xlsx",
    format: "kenay-xlsx",
    defaultVatRate: 8,
  },
  {
    kind: "file",
    id: "pure-hydration",
    label: "Pure Hydration (PUDE)",
    brandName: "Pure Hydration",
    brandSlug: "pure-hydration",
    filePath: "2026 FORMATKA z sugerowaną ceną internetową (3).xlsx",
    format: "pure-hydration-xlsx",
    defaultVatRate: 23,
  },
  {
    kind: "api",
    id: "shoper",
    label: "Shoper (API)",
    brandName: "Shoper",
    brandSlug: "shoper",
    format: "shoper-api",
    defaultVatRate: 23,
  },
];

/** Extract supplier zip packshots here for automatic local image matching */
export const SUPPLIER_IMAGES_DIR = "data/suppliers/images";

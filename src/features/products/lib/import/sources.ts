export type SupplierFileFormat =
  | "yango-csv"
  | "kenay-xlsx"
  | "pure-hydration-xlsx"
  | "bestlab-pdf"
  | "mitopharma-xlsx"
  | "formeds-xlsx"
  | "healthlabs-manifest-json";

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
    kind: "file",
    id: "bestlab",
    label: "BestLab",
    brandName: "BestLab",
    brandSlug: "bestlab",
    filePath: "Cennik_hurtowyPDF.pdf",
    format: "bestlab-pdf",
    defaultVatRate: 8,
  },
  {
    kind: "file",
    id: "mitopharma",
    label: "Mitopharma",
    brandName: "Mitopharma",
    brandSlug: "mitopharma",
    filePath: "Mitopharma - cennik hurtowy.xlsx",
    format: "mitopharma-xlsx",
    defaultVatRate: 8,
  },
  {
    kind: "file",
    id: "formeds",
    label: "Formeds (bez cen — tylko opisy)",
    brandName: "Formeds",
    brandSlug: "formeds",
    filePath: "Formeds - dane produktow.xlsx",
    format: "formeds-xlsx",
    defaultVatRate: 8,
  },
  {
    kind: "file",
    id: "healthlabs",
    label: "HealthLabs Care (bez cen — tylko nazwy)",
    brandName: "HealthLabs Care",
    brandSlug: "healthlabs-care",
    filePath: "data/suppliers/healthlabs-manifest.json",
    format: "healthlabs-manifest-json",
    defaultVatRate: 8,
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

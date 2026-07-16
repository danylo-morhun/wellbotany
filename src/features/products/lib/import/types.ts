export type SupplierProductDraft = {
  sourceId: string;
  externalKey: string;
  name: string;
  brandName?: string;
  brandSlug?: string;
  categoryName?: string;
  packaging?: string;
  sku?: string;
  ean?: string;
  /** Shoper's numeric product_id — persisted so a later sync can refresh
   *  this exact product via GET /products/{id} instead of re-matching by
   *  SKU/EAN. Only set by the Shoper API source. */
  externalProductId?: number;
  priceGrosz: number;
  costPriceGrosz?: number;
  vatRate: number;
  stock: number;
  imageUrl?: string;
  localImagePath?: string;
};

export type ImportRowResult = {
  externalKey: string;
  name: string;
  status: "created" | "updated" | "skipped" | "error";
  productId?: string;
  message?: string;
};

export type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: ImportRowResult[];
};

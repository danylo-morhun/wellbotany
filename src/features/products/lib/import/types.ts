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
  /** Extra gallery images beyond the single main `imageUrl`/`localImagePath`. */
  extraImageUrls?: string[];

  // Optional rich content, verbatim from the supplier's own catalog copy
  // (never AI-generated for facts/health claims — AI may only polish wording,
  // e.g. `benefitsPl` marketing bullets or translations, never invent dosage,
  // ingredients, or warning text). See import-supplier skill for the full policy.
  descriptionPl?: string;
  shortDescPl?: string;
  ingredientsPl?: string;
  /** Legacy free-text nutrition block; prefer `nutritionFacts` (structured) when the
   *  supplier page has a parseable table — it renders as a proper label table in the UI. */
  nutritionFactsPl?: string;
  nutritionFacts?: Array<{ name: string; amount: string; rws?: string }>;
  healthWarningsPl?: string;
  /** Product-specific regulatory warnings, one per array item (preferred over the
   *  single `healthWarningsPl` string when the source page lists them separately). */
  healthWarnings?: string[];
  servingSize?: string;
  servingsPerContainer?: number;
  storageInfo?: string;
  /** Short marketing bullets shown under the title (max 4-6). AI-polish OK here —
   *  it's a hook, not a factual/health claim. */
  benefitsPl?: string[];
  /** EU Reg. 1169/2011 Art. 9(1)(c) — mandatory whenever an Annex II allergen is
   *  present in `ingredientsPl`. Populate `contains` from a detected-allergen scan;
   *  never leave silently empty for a product whose ingredients name one. */
  allergenContains?: string[];
  allergenMayContain?: string[];
  /** Manufacturer/EU responsible entity name + address — Art. 9(1)(h), mandatory.
   *  Usually identical across a whole supplier's catalog; scrape once, reuse. */
  responsibleEntity?: string;
  countryOfOrigin?: string;
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

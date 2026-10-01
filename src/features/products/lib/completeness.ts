type ProductForCompleteness = {
  descriptionPl: string | null;
  shortDescPl: string | null;
  categoryId: string | null;
  brandId: string | null;
  ingredients: unknown;
  usageInstructionsPl: string | null;
  responsibleEntity: string | null;
  metaDescPl: string | null;
  images: unknown[];
  variants: { ean: string | null }[];
};

export type CompletenessCheck = { key: string; label: string; ok: boolean };

const filled = (v: unknown) =>
  v != null && (typeof v !== "string" || v.trim() !== "") && (!Array.isArray(v) || v.length > 0);

/** What a product card still lacks before it's fit for the shop and the Merchant Center feed */
export function productCompleteness(p: ProductForCompleteness) {
  const checks: CompletenessCheck[] = [
    { key: "images", label: "Zdjęcie", ok: p.images.length > 0 },
    { key: "description", label: "Opis", ok: filled(p.descriptionPl) },
    { key: "shortDesc", label: "Krótki opis", ok: filled(p.shortDescPl) },
    { key: "category", label: "Kategoria", ok: filled(p.categoryId) },
    { key: "brand", label: "Marka", ok: filled(p.brandId) },
    {
      key: "ean",
      label: "EAN wszystkich wariantów",
      ok: p.variants.length > 0 && p.variants.every((v) => filled(v.ean)),
    },
    { key: "ingredients", label: "Skład", ok: filled(p.ingredients) },
    { key: "usage", label: "Sposób użycia", ok: filled(p.usageInstructionsPl) },
    { key: "responsible", label: "Podmiot odpowiedzialny", ok: filled(p.responsibleEntity) },
    { key: "seo", label: "Meta opis (SEO)", ok: filled(p.metaDescPl) },
  ];
  const done = checks.filter((c) => c.ok).length;
  return { checks, score: Math.round((done / checks.length) * 100) };
}

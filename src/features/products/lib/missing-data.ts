import type { ProductKind } from "./product-kind";

// Label data the law asks for, per product kind:
// - skład: food and supplements (FIC 1169/2011 art. 9, art. 14 for distance selling)
// - ostrzeżenia + porcja: supplements only (rozp. MZ z 9.10.2007, § 3)
// - zdjęcie: every product (no photo = no card in the shop or the feed)
export type MissingField = "ingredients" | "warnings" | "usage" | "image";

export const MISSING_FIELDS: Record<MissingField, { label: string; section: string }> = {
  ingredients: { label: "Skład", section: "sklad" },
  warnings: { label: "Ostrzeżenia", section: "zgodnosc" },
  usage: { label: "Porcja / sposób użycia", section: "sklad" },
  image: { label: "Zdjęcie", section: "media" },
};

export type MissingDataInput = {
  kind: ProductKind;
  ingredients: unknown; // { pl, en } JSON
  healthWarnings: unknown; // string[] JSON
  usageInstructionsPl: string | null;
  servingSize: string | null;
  imageCount: number;
};

const text = (v: unknown) => typeof v === "string" && v.trim() !== "";

function hasIngredients(v: unknown) {
  if (text(v)) return true;
  return typeof v === "object" && v !== null && text((v as { pl?: unknown }).pl);
}

const hasWarnings = (v: unknown) => Array.isArray(v) && v.some(text);

/** Required label data this product still lacks, in display order. */
export function missingData(p: MissingDataInput): MissingField[] {
  const isFood = p.kind !== "nonFood";
  const isSupplement = p.kind === "supplement";
  const checks: [MissingField, boolean][] = [
    ["ingredients", isFood && !hasIngredients(p.ingredients)],
    ["warnings", isSupplement && !hasWarnings(p.healthWarnings)],
    ["usage", isSupplement && !text(p.usageInstructionsPl) && !text(p.servingSize)],
    ["image", p.imageCount === 0],
  ];
  return checks.filter(([, missing]) => missing).map(([field]) => field);
}

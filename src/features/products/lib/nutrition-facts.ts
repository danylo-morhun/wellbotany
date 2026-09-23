export type NutritionRow = { name: string; amount: string; rws?: string };

// Product.nutritionFacts holds either structured rows (admin form, most
// importers) or a supplier's free-text label as { pl: "..." } (MSE/ForMeds
// imports). Both shapes are valid — callers render rows as a table, text as-is.
export type NutritionFacts = { rows: NutritionRow[]; text: string | null };

export function readNutritionFacts(value: unknown): NutritionFacts {
  if (Array.isArray(value)) {
    const rows = value.filter(
      (r): r is NutritionRow => typeof r?.name === "string" && typeof r?.amount === "string",
    );
    return { rows, text: null };
  }
  if (value && typeof value === "object" && typeof (value as { pl?: unknown }).pl === "string") {
    const text = (value as { pl: string }).pl.trim();
    return { rows: [], text: text || null };
  }
  return { rows: [], text: null };
}

/** Admin textarea value: pipe rows, or the legacy free text unchanged. */
export function nutritionFactsToText({ rows, text }: NutritionFacts): string {
  if (text) return text;
  return rows.map((n) => `${n.name} | ${n.amount}${n.rws ? ` | ${n.rws}` : ""}`).join("\n");
}

/**
 * Inverse of nutritionFactsToText. Every line in "Name | amount" form →
 * structured rows; anything else is kept as free text so saving the form
 * never drops an imported label.
 */
export function parseNutritionFactsText(input: string): NutritionRow[] | { pl: string } {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = lines.map((line) => {
    const [name, amount, rws] = line.split("|").map((s) => s.trim());
    return { name: name ?? "", amount: amount ?? "", rws: rws || undefined };
  });
  if (rows.every((r) => r.name && r.amount)) return rows;
  return { pl: input.trim() };
}

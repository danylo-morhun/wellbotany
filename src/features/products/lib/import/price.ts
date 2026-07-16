/** Parse Polish price strings like "28,73 zł" or "49.99" into grosz */
export function parsePriceToGrosz(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.round(value * 100);
  }

  const normalized = value.replace(/\s*zł/gi, "").replace(/\s/g, "").replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export function parseVatRate(value: string | number | undefined | null, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const num =
    typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(num) || num < 0) return fallback;
  // Kenay stores 0.08 for 8%
  if (num > 0 && num < 1) return Math.round(num * 100);
  return num;
}

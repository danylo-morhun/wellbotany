/** Grosze → "12,99" for a Polish admin input (no currency sign) */
export function formatPlnInput(grosz: number): string {
  return (grosz / 100).toFixed(2).replace(".", ",");
}

/** "12,99" / "12.99" / "1 299,00" → grosze; null when not a positive amount */
export function parsePlnInput(value: string): number | null {
  const cleaned = value.replace(/[\s ]/g, "").replace(/zł$/i, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const grosz = Math.round(Number(cleaned) * 100);
  return grosz > 0 ? grosz : null;
}

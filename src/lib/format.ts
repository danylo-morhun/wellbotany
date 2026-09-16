export function formatPrice(grosz: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(grosz / 100);
}

/** Marketing copy: "200 zł" for whole amounts, "199,99 zł" otherwise. */
export function formatPriceCompact(grosz: number): string {
  const fractionDigits = grosz % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(grosz / 100);
}

export function formatPriceRaw(grosz: number): string {
  return (grosz / 100).toFixed(2);
}

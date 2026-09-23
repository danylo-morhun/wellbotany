type VariantImage = { variantId: string | null };

/**
 * Photos for the selected variant: its own if it has any, otherwise the
 * product-wide ones (variantId null) — so one pack size never shows another
 * pack's photo. Falls back to everything rather than an empty gallery.
 */
export function imagesForVariant<T extends VariantImage>(
  images: T[],
  variantId: string | null,
): T[] {
  const own = variantId ? images.filter((img) => img.variantId === variantId) : [];
  if (own.length > 0) return own;
  const shared = images.filter((img) => img.variantId === null);
  return shared.length > 0 ? shared : images;
}

/** `?wariant=` if it names one of the product's active variants, else the default one. */
export function resolveVariantId(
  variants: { id: string; isDefault: boolean }[],
  requested: string | string[] | undefined,
): string | null {
  const wanted = typeof requested === "string" ? requested : undefined;
  if (wanted && variants.some((v) => v.id === wanted)) return wanted;
  return (variants.find((v) => v.isDefault) ?? variants[0])?.id ?? null;
}

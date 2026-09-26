import { formatPrice } from "./format";

/**
 * Omnibus note shown next to a struck-through price (art. 6a ustawy o
 * informowaniu o cenach). `lowestPrice30dPln` is frozen by the DB trigger when
 * the reduction starts. Null when there is no reduction to explain.
 */
export function omnibusNote(variant: {
  pricePln: number;
  comparePricePln: number | null;
  lowestPrice30dPln: number | null;
}): string | null {
  const { pricePln, comparePricePln, lowestPrice30dPln } = variant;
  if (comparePricePln == null || comparePricePln <= pricePln || lowestPrice30dPln == null) {
    return null;
  }
  return `Najniższa cena z 30 dni przed obniżką: ${formatPrice(lowestPrice30dPln)}`;
}

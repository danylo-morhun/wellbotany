import { formatPrice } from "./format";

type PricedOffer = {
  pricePln: number;
  comparePricePln: number | null;
  lowestPrice30dPln: number | null;
};

/**
 * Size of a reduction in percent, measured against the lowest price of the 30
 * days before it (art. 6a ust. 2 ustawy o informowaniu o cenach) — never
 * against the regular "was" price. Null when there is no real reduction: no
 * compare price, or the price was already this low in the last 30 days.
 * The storefront shows a promotion (strikethrough, badge, note) only when this
 * is non-null.
 */
export function discountPercent({
  pricePln,
  comparePricePln,
  lowestPrice30dPln,
}: PricedOffer): number | null {
  if (comparePricePln == null || comparePricePln <= pricePln) return null;
  if (lowestPrice30dPln == null || lowestPrice30dPln <= pricePln) return null;
  const percent = Math.round(((lowestPrice30dPln - pricePln) / lowestPrice30dPln) * 100);
  return percent > 0 ? percent : null;
}

/**
 * Price shown struck through next to the current one: the same 30-day low the
 * percent is measured from (CJEU C-330/23), so the badge and the struck price
 * agree. Null when there is no reduction.
 */
export function referencePrice(offer: PricedOffer): number | null {
  return discountPercent(offer) == null ? null : offer.lowestPrice30dPln;
}

/**
 * Omnibus note shown next to a struck-through price. `lowestPrice30dPln` is
 * frozen by the DB trigger when the reduction starts. Null when there is no
 * reduction to explain.
 */
export function omnibusNote(offer: PricedOffer): string | null {
  if (discountPercent(offer) == null || offer.lowestPrice30dPln == null) return null;
  return `Najniższa cena z 30 dni przed obniżką: ${formatPrice(offer.lowestPrice30dPln)}`;
}

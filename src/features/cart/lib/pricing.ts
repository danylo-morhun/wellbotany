import type { CartItem } from "./session";

/** Per-unit price to charge for this line — the gift-set allocation if set, else the variant's own price. */
export function effectiveUnitPricePln(
  item: Pick<CartItem, "unitPriceOverridePln" | "variant">,
): number {
  return item.unitPriceOverridePln ?? item.variant.pricePln;
}

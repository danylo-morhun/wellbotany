import { discountPercent } from "@/lib/omnibus";
import type { CartItem } from "./session";

/** Per-unit price to charge for this line — the gift-set allocation if set, else the variant's own price. */
export function effectiveUnitPricePln(
  item: Pick<CartItem, "unitPriceOverridePln" | "variant">,
): number {
  return item.unitPriceOverridePln ?? item.variant.pricePln;
}

type PricedOffer = Parameters<typeof discountPercent>[0];

type SaleCheckItem = {
  quantity: number;
  unitPriceOverridePln: number | null;
  variant: PricedOffer;
  giftSet: PricedOffer | null;
};

/**
 * Subtotal of lines the storefront shows as on sale (lib/omnibus): a reduced
 * variant, or a component of a reduced curated gift set. Custom-built set
 * lines follow their own variant.
 */
export function saleSubtotalPln(items: SaleCheckItem[]): number {
  return items.reduce((sum, item) => {
    const onSale = discountPercent(item.giftSet ?? item.variant) != null;
    const unit = item.unitPriceOverridePln ?? item.variant.pricePln;
    return onSale ? sum + unit * item.quantity : sum;
  }, 0);
}

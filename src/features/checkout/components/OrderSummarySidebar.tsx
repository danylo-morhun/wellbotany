import { groupCartItems } from "@/features/cart/lib/grouping";
import { effectiveUnitPricePln } from "@/features/cart/lib/pricing";
import type { CartItem } from "@/features/cart/lib/session";
import type { CartDiscount } from "@/features/promotions/lib/tiered";
import { formatPrice, formatPriceCompact, pluralPl } from "@/lib/format";
import {
  deliveryEstimate,
  type OrderTotals,
  type ShippingMethodKey,
  shippingLabel,
} from "../lib/shipping";
import { DeliveryEstimateValue } from "./DeliveryEstimateValue";

type Props = {
  items: CartItem[];
  subtotal: number;
  discount: CartDiscount;
  promoName?: string;
  couponCode: string;
  freeShippingThresholdPln: number | null;
  cheapestShippingPln: number | null;
  /** The chosen method and what it costs for this order; null before the delivery step */
  shipping: { method: ShippingMethodKey; pricePln: number } | null;
  totals: OrderTotals;
};

export function OrderSummarySidebar({
  items,
  subtotal,
  discount,
  promoName,
  couponCode,
  freeShippingThresholdPln,
  cheapestShippingPln,
  shipping,
  totals,
}: Props) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const estimate = deliveryEstimate(
    totals.productsPln,
    freeShippingThresholdPln,
    cheapestShippingPln,
  );
  // The total is final once a method is chosen, or when delivery is free anyway
  const totalKnown = shipping !== null || estimate.free;

  return (
    <aside
      aria-label="Podsumowanie zamówienia"
      className="min-w-0 lg:sticky lg:top-8 lg:self-start"
    >
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold">
          Twoje zamówienie ({itemCount} {pluralPl(itemCount, "produkt", "produkty", "produktów")})
        </h2>
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {groupCartItems(items).map((row) =>
            row.kind === "single" ? (
              <li key={row.item.id} className="flex justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 break-words text-muted-foreground">
                  {row.item.variant.product.namePl}
                  {row.item.variant.optionValue ? ` (${row.item.variant.optionValue})` : ""} ×{" "}
                  {row.item.quantity}
                </span>
                <span className="shrink-0">
                  {formatPrice(effectiveUnitPricePln(row.item) * row.item.quantity)}
                </span>
              </li>
            ) : (
              <li key={row.groupId} className="py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="min-w-0 break-words font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="shrink-0">{formatPrice(row.totalPln)}</span>
                </div>
              </li>
            ),
          )}
        </ul>

        <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Produkty</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          {discount.discountPln > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {discount.source === "promo" ? `Rabat ${promoName ?? ""}` : `Rabat (${couponCode})`}
              </dt>
              <dd className="text-success">-{formatPrice(discount.discountPln)}</dd>
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <dt className="text-muted-foreground">
              Dostawa
              {shipping && <span className="block text-xs">{shippingLabel(shipping.method)}</span>}
            </dt>
            <dd>
              {shipping ? (
                <span className="block text-right">
                  <span className={shipping.pricePln === 0 ? "font-medium text-success" : ""}>
                    {formatPrice(shipping.pricePln)}
                  </span>
                  {shipping.pricePln === 0 &&
                    estimate.free &&
                    freeShippingThresholdPln !== null && (
                      <span className="block text-xs text-muted-foreground">
                        darmowa od {formatPriceCompact(freeShippingThresholdPln)}
                      </span>
                    )}
                </span>
              ) : (
                <DeliveryEstimateValue
                  estimate={estimate}
                  freeShippingThresholdPln={freeShippingThresholdPln}
                />
              )}
            </dd>
          </div>
          {/* Polite live region: the total changes as the shopper switches methods */}
          <div
            aria-live="polite"
            className="flex items-baseline justify-between gap-3 border-t border-border pt-2 font-semibold"
          >
            <dt>
              {totalKnown ? "Do zapłaty" : "Razem"}
              {!totalKnown && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">bez dostawy</span>
              )}
            </dt>
            <dd className="tabular-nums">
              {formatPrice(shipping ? totals.totalPln : totals.productsPln)}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}

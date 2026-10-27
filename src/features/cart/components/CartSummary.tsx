"use client";

import Link from "next/link";
import { useState } from "react";
import { DeliveryEstimateValue } from "@/features/checkout/components/DeliveryEstimateValue";
import { deliveryEstimate, orderTotals } from "@/features/checkout/lib/shipping";
import { cartDiscount, nextTier, type TierPromo } from "@/features/promotions/lib/tiered";
import { formatPrice } from "@/lib/format";
import { CouponInput } from "./CouponInput";
import { ShippingProgress } from "./ShippingProgress";

type Props = {
  subtotal: number;
  saleSubtotal: number;
  /** Live cart promotion, if any */
  promo: TierPromo | null;
  freeShippingThresholdPln: number | null;
  /** Cheapest paid delivery method, null when none is enabled */
  cheapestShippingPln: number | null;
};

export function CartSummary({
  subtotal,
  saleSubtotal,
  promo,
  freeShippingThresholdPln,
  cheapestShippingPln,
}: Props) {
  const [couponDiscount, setCouponDiscount] = useState(0);
  const {
    discountPln: discount,
    source,
    note,
  } = cartDiscount(promo, subtotal, saleSubtotal, couponDiscount);
  const next = promo ? nextTier(promo.tiers, subtotal) : null;
  const { productsPln } = orderTotals(subtotal, discount, 0, freeShippingThresholdPln);
  const delivery = deliveryEstimate(productsPln, freeShippingThresholdPln, cheapestShippingPln);
  // Until a method is picked the total can only include delivery when it's free
  const total = productsPln;

  return (
    <div className="rounded-xl bg-card shadow-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Podsumowanie zamówienia</h2>
      </div>

      <div className="space-y-3 px-6 py-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Wartość produktów</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {source === "promo" ? `Rabat ${promo?.name}` : "Rabat"}
            </span>
            <span className="font-medium text-success">-{formatPrice(discount)}</span>
          </div>
        )}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {next && (
          <p className="rounded-lg bg-accent/15 px-3 py-2 text-xs">
            Dodaj produkty za <strong>{formatPrice(next.missingPln)}</strong>, a dostaniesz -
            {next.tier.percent}% ({promo?.name}).
          </p>
        )}
        <div className="flex items-start justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Dostawa</span>
          <DeliveryEstimateValue
            estimate={delivery}
            freeShippingThresholdPln={freeShippingThresholdPln}
          />
        </div>
        {freeShippingThresholdPln !== null && (
          <ShippingProgress productsPln={productsPln} threshold={freeShippingThresholdPln} />
        )}

        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-base">
          <span className="font-semibold">
            Razem
            {!delivery.free && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">bez dostawy</span>
            )}
          </span>
          <span className="font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <CouponInput
          subtotal={subtotal}
          saleSubtotal={saleSubtotal}
          onDiscount={setCouponDiscount}
        />
      </div>

      <div className="px-6 pb-5">
        <Link
          href="/zamowienie"
          className="block w-full rounded-full bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground transition-[transform,background-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-deep active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Przejdź do kasy
        </Link>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Bezpieczna płatność · Szybka wysyłka
        </p>
      </div>
    </div>
  );
}

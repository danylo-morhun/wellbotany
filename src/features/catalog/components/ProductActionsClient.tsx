"use client";

import { useRef } from "react";
import type { Variant } from "@/features/cart/components/AddToCartSection";
import { AddToCartSection } from "@/features/cart/components/AddToCartSection";
import { StickyAddToCart } from "./StickyAddToCart";
import { useVariantSelection } from "./VariantSelection";

type Props = {
  variants: Variant[];
  productName: string;
};

export function ProductActionsClient({ variants, productName }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const selectedId = useVariantSelection()?.selectedId;
  const defaultVariant =
    variants.find((v) => v.id === selectedId) ?? variants.find((v) => v.isDefault) ?? variants[0];

  return (
    <>
      <div ref={anchorRef}>
        <AddToCartSection variants={variants} />
      </div>
      {defaultVariant && (
        <StickyAddToCart
          productName={productName}
          selectedVariantId={defaultVariant.id}
          price={defaultVariant.pricePln}
          stock={defaultVariant.stock}
          anchorRef={anchorRef}
        />
      )}
    </>
  );
}

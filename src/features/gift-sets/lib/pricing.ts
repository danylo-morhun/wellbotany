import type { GiftBuilderPricingMode } from "@prisma/client";

export type GiftBuilderPolicy = {
  pricingMode: GiftBuilderPricingMode;
  boxPricePln: number | null;
  packagingFeePln: number;
  minItems: number;
  maxItems: number;
};

/**
 * Used when no admin has saved GiftBuilderSettings yet (id=1 row missing) —
 * the builder should work out of the box (sum of chosen items, no fee)
 * rather than appear unavailable until someone visits the settings page.
 */
export const DEFAULT_GIFT_BUILDER_POLICY = {
  isActive: true,
  namePl: "Zestaw prezentowy",
  pricingMode: "SUM_PLUS_FEE" as GiftBuilderPricingMode,
  boxPricePln: null,
  packagingFeePln: 0,
  minItems: 3,
  maxItems: 8,
};

export type GiftBuilderComponent = {
  variantId: string;
  quantity: number;
  unitPricePln: number;
};

export type GiftBuilderAllocation = {
  variantId: string;
  quantity: number;
  unitPriceOverridePln: number;
  lineTotalPln: number;
};

/**
 * Target price for the whole box under the current policy, before
 * per-line allocation/rounding.
 */
export function giftBuilderTargetTotalPln(
  policy: GiftBuilderPolicy,
  components: GiftBuilderComponent[],
): number {
  if (policy.pricingMode === "FIXED_BOX") {
    return policy.boxPricePln ?? 0;
  }
  const sum = components.reduce((s, c) => s + c.unitPricePln * c.quantity, 0);
  return sum + policy.packagingFeePln;
}

/**
 * Splits a fixed box total across its components, weighted by each
 * component's own price. The returned totalPln (sum of lineTotalPln) is the
 * authoritative charge — display and charge this, not the nominal target —
 * since per-unit rounding to whole grosz can drift the sum by a few grosz.
 */
export function allocateGiftBoxPrice(
  components: GiftBuilderComponent[],
  targetTotalPln: number,
): { lines: GiftBuilderAllocation[]; totalPln: number } {
  const sumWeights = components.reduce((s, c) => s + c.unitPricePln * c.quantity, 0);

  const lines = components.map((c): GiftBuilderAllocation => {
    const weight = c.unitPricePln * c.quantity;
    const unitPriceOverridePln =
      sumWeights > 0
        ? Math.round((targetTotalPln * weight) / sumWeights / c.quantity)
        : Math.round(targetTotalPln / components.length / c.quantity);
    return {
      variantId: c.variantId,
      quantity: c.quantity,
      unitPriceOverridePln,
      lineTotalPln: unitPriceOverridePln * c.quantity,
    };
  });

  const totalPln = lines.reduce((s, l) => s + l.lineTotalPln, 0);
  return { lines, totalPln };
}

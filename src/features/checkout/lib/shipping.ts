export const SHIPPING_COSTS = {
  INPOST_PACZKOMAT: 1299,
  INPOST_KURIER: 1999,
  ORLEN_PACZKA: 1299,
  PICKUP: 0,
} as const;

export const SHIPPING_LABELS = {
  INPOST_PACZKOMAT: "InPost Paczkomat",
  INPOST_KURIER: "InPost Kurier",
  ORLEN_PACZKA: "Orlen Paczka",
  PICKUP: "Odbiór osobisty w Kaliszu",
} as const;

export type ShippingMethodKey = keyof typeof SHIPPING_COSTS;

/** Methods delivered to the customer's door — the only ones that need a street address. */
export const ADDRESS_SHIPPING_METHODS: readonly string[] = ["INPOST_KURIER"];

export function requiresAddress(method: string): boolean {
  return ADDRESS_SHIPPING_METHODS.includes(method);
}

/**
 * Delivery cost for an order. `productsPln` is the subtotal after discounts;
 * `freeShippingThresholdPln` null means free delivery is switched off.
 */
export function shippingCostFor(
  method: ShippingMethodKey,
  productsPln: number,
  freeShippingThresholdPln: number | null,
): number {
  if (freeShippingThresholdPln !== null && productsPln >= freeShippingThresholdPln) return 0;
  return SHIPPING_COSTS[method];
}

/** Label for any stored ShippingMethod, including ones not offered at checkout. */
export function shippingLabel(method: string): string {
  const other: Record<string, string> = {
    DHL: "DHL Kurier",
    DPD: "DPD Kurier",
    COURIER: "Kurier",
  };
  return SHIPPING_LABELS[method as ShippingMethodKey] ?? other[method] ?? method;
}

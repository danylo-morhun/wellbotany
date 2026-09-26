// Grosz, customer prices approved 2026-09-26 — below epaka cost on purpose
// (cost 2026-09-26: Paczkomat B 19,00, Orlen 14,99, InPost Kurier 19,37).
// Mirrored outside the code: Google Merchant Center shipping settings (cheapest
// rate, free threshold, handling time) — change them too, or MC flags a mismatch.
export const SHIPPING_COSTS = {
  INPOST_PACZKOMAT: 1299,
  INPOST_KURIER: 1699,
  ORLEN_PACZKA: 1199,
  PICKUP: 0,
} as const;

export const SHIPPING_LABELS = {
  INPOST_PACZKOMAT: "InPost Paczkomat",
  INPOST_KURIER: "InPost Kurier",
  ORLEN_PACZKA: "Orlen Paczka",
  PICKUP: "Odbiór osobisty w Kaliszu",
} as const;

export type ShippingMethodKey = keyof typeof SHIPPING_COSTS;

/** Display order: cheapest first; in-store pickup last since it only suits local customers. */
export const SHIPPING_METHODS_BY_PRICE = (Object.keys(SHIPPING_COSTS) as ShippingMethodKey[]).sort(
  (a, b) =>
    Number(a === "PICKUP") - Number(b === "PICKUP") || SHIPPING_COSTS[a] - SHIPPING_COSTS[b],
);

/** Methods delivered to the customer's door — the only ones that need a street address. */
export const ADDRESS_SHIPPING_METHODS: readonly string[] = ["INPOST_KURIER"];

export function requiresAddress(method: string): boolean {
  return ADDRESS_SHIPPING_METHODS.includes(method);
}

/** Carriers with pickup points, keyed as the /api/points route accepts them. */
export type PointService = "inpost" | "orlen";

/** Methods delivered to a pickup point / parcel locker — the customer picks the point on a map. */
export const PICKUP_POINT_METHODS: Partial<
  Record<ShippingMethodKey, { service: PointService; pointName: string; placeholder: string }>
> = {
  INPOST_PACZKOMAT: { service: "inpost", pointName: "paczkomat", placeholder: "np. WAW123M" },
  ORLEN_PACZKA: {
    service: "orlen",
    pointName: "punkt Orlen Paczka",
    placeholder: "np. KA-123264-W9-15",
  },
};

export function requiresPickupPoint(method: string): boolean {
  return method in PICKUP_POINT_METHODS;
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

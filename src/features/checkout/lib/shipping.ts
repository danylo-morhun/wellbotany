import type { ShippingMethod } from "@prisma/client";

// Customer prices live in the ShippingRate table (edited in /admin/dostawa).
// Mirrored outside the code: Google Merchant Center shipping settings (cheapest
// rate, free threshold, handling time) — change them too, or MC flags a mismatch.

type Carrier = {
  label: string;
  /** epaka.pl courier id (GET https://api.epaka.pl/v1/couriers); null = not shipped via epaka */
  epakaCourierId: number | null;
  /** point = customer picks a pickup point; door = courier to the street address */
  delivery: "point" | "door" | "store";
  /** Pickup-point wording for the checkout, e.g. "Wybierz paczkomat" */
  point?: { name: string; placeholder: string };
  /** Carrier logo in /public (from epaka's courier list); none = in-store pickup */
  logo?: string;
};

/** Every method the checkout can offer. Order here is the admin table order. */
export const CARRIERS = {
  INPOST_PACZKOMAT: {
    label: "InPost Paczkomat",
    epakaCourierId: 6,
    delivery: "point",
    point: { name: "paczkomat", placeholder: "np. WAW123M" },
    logo: "/images/carriers/inpost.svg",
  },
  ORLEN_PACZKA: {
    label: "Orlen Paczka",
    epakaCourierId: 11,
    delivery: "point",
    point: { name: "punkt Orlen Paczka", placeholder: "np. KA-123264-W9-15" },
    logo: "/images/carriers/orlen.svg",
  },
  DPD_PICKUP: {
    label: "DPD Pickup",
    epakaCourierId: 20,
    delivery: "point",
    point: { name: "punkt DPD Pickup", placeholder: "np. PL82690" },
    logo: "/images/carriers/dpd-pickup.svg",
  },
  DHL_POINT: {
    label: "DHL POP / Automat DHL",
    epakaCourierId: 22,
    delivery: "point",
    point: { name: "punkt DHL", placeholder: "np. 4599189" },
    logo: "/images/carriers/dhl-point.svg",
  },
  FEDEX_POINT: {
    label: "FedEx Punkt",
    epakaCourierId: 45,
    delivery: "point",
    point: { name: "punkt FedEx", placeholder: "np. 48906" },
    logo: "/images/carriers/fedex-point.svg",
  },
  EPAKA_POINT: {
    label: "Punkt epaka.pl",
    epakaCourierId: 63,
    delivery: "point",
    point: { name: "punkt epaka.pl", placeholder: "np. EPK0132" },
    logo: "/images/carriers/epaka.svg",
  },
  INPOST_KURIER: {
    label: "InPost Kurier",
    epakaCourierId: 12,
    delivery: "door",
    logo: "/images/carriers/inpost-kurier.svg",
  },
  DPD: {
    label: "DPD Kurier",
    epakaCourierId: 1,
    delivery: "door",
    logo: "/images/carriers/dpd.svg",
  },
  DHL: {
    label: "DHL Kurier",
    epakaCourierId: 8,
    delivery: "door",
    logo: "/images/carriers/dhl.svg",
  },
  GLS: {
    label: "GLS Kurier",
    epakaCourierId: 50,
    delivery: "door",
    logo: "/images/carriers/gls.svg",
  },
  FEDEX: {
    label: "FedEx Kurier",
    epakaCourierId: 5,
    delivery: "door",
    logo: "/images/carriers/fedex.svg",
  },
  POCZTEX: {
    label: "Pocztex Kurier 24",
    epakaCourierId: 18,
    delivery: "door",
    logo: "/images/carriers/pocztex.svg",
  },
  POCZTA_POLSKA: {
    label: "Poczta Polska Paczka 48",
    epakaCourierId: 17,
    delivery: "door",
    logo: "/images/carriers/poczta-polska.webp",
  },
  PICKUP: { label: "Odbiór osobisty w Kaliszu", epakaCourierId: null, delivery: "store" },
} as const satisfies Partial<Record<ShippingMethod, Carrier>>;

export type ShippingMethodKey = keyof typeof CARRIERS;

export const SHIPPING_METHOD_KEYS = Object.keys(CARRIERS) as [
  ShippingMethodKey,
  ...ShippingMethodKey[],
];

/** A method the checkout offers right now, with its regular (non-free) price in grosz. */
export type ShippingRate = { method: ShippingMethodKey; pricePln: number };

/** Display order: cheapest first; in-store pickup last since it only suits local customers. */
export function sortRates(rates: ShippingRate[]): ShippingRate[] {
  return [...rates].sort(
    (a, b) =>
      Number(a.method === "PICKUP") - Number(b.method === "PICKUP") || a.pricePln - b.pricePln,
  );
}

/** Lowest paid price among `rates` (in-store pickup is free but local only); null when none. */
export function cheapestPaidRate(
  rates: ShippingRate[],
  delivery?: Carrier["delivery"],
): number | null {
  const prices = rates
    .filter((r) => r.pricePln > 0 && (!delivery || CARRIERS[r.method].delivery === delivery))
    .map((r) => r.pricePln);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Carriers with pickup points — the /api/points route accepts these as `service`. */
export type PointService = {
  [K in ShippingMethodKey]: (typeof CARRIERS)[K] extends { delivery: "point" } ? K : never;
}[ShippingMethodKey];

export function isPointService(value: string | null): value is PointService {
  return (
    value !== null && value in CARRIERS && CARRIERS[value as ShippingMethodKey].delivery === "point"
  );
}

/** Methods delivered to the customer's door — the only ones that need a street address. */
export function requiresAddress(method: string): boolean {
  return method in CARRIERS && CARRIERS[method as ShippingMethodKey].delivery === "door";
}

/** Methods delivered to a pickup point / parcel locker — the customer picks the point on a map. */
export function requiresPickupPoint(method: string): boolean {
  return isPointService(method);
}

/**
 * Delivery cost for an order. `pricePln` is the method's regular price,
 * `productsPln` the subtotal after discounts; `freeShippingThresholdPln` null
 * means free delivery is switched off.
 */
export function shippingCostFor(
  pricePln: number,
  productsPln: number,
  freeShippingThresholdPln: number | null,
): number {
  if (freeShippingThresholdPln !== null && productsPln >= freeShippingThresholdPln) return 0;
  return pricePln;
}

/** Logo path for a method; null for in-store pickup. */
export function carrierLogo(method: ShippingMethodKey): string | null {
  const carrier: Carrier = CARRIERS[method];
  return carrier.logo ?? null;
}

/** Label for any stored ShippingMethod, including ones not offered at checkout. */
export function shippingLabel(method: string): string {
  if (method in CARRIERS) return CARRIERS[method as ShippingMethodKey].label;
  return method === "COURIER" ? "Kurier" : method;
}

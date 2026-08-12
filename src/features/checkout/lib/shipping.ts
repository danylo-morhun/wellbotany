export const SHIPPING_COSTS = {
  INPOST_PACZKOMAT: 1299,
  INPOST_KURIER: 1999,
  ORLEN_PACZKA: 1299,
} as const;

export const SHIPPING_LABELS = {
  INPOST_PACZKOMAT: "InPost Paczkomat",
  INPOST_KURIER: "InPost Kurier",
  ORLEN_PACZKA: "Orlen Paczka",
} as const;

export type ShippingMethodKey = keyof typeof SHIPPING_COSTS;

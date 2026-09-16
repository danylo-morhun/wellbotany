// In-store pickup points. Keys are stored in Order.pickupLocation — never rename
// an existing key, add a new one instead.
export const PICKUP_LOCATIONS = {
  KALISZ_POLNA: {
    name: "Zielarnia Twoje Zdrowie",
    address: "ul. Polna 102, 62-800 Kalisz",
    hours: ["Pon–Pt: 9:00–18:00", "Sob: 9:00–14:00"],
  },
  KALISZ_MLYNARSKA: {
    name: "Zielarnia Twoje Zdrowie",
    address: "ul. Młynarska 69, 62-800 Kalisz",
    hours: ["Pon–Pt: 9:00–18:00", "Sob: 9:00–14:00"],
  },
} as const;

export type PickupLocationKey = keyof typeof PICKUP_LOCATIONS;

export const PICKUP_LOCATION_KEYS = Object.keys(PICKUP_LOCATIONS) as [
  PickupLocationKey,
  ...PickupLocationKey[],
];

/** How long a ready order waits in store before it's cancelled. */
export const PICKUP_HOLD_DAYS = 7;

export function pickupLocation(key: string | null | undefined) {
  return key && key in PICKUP_LOCATIONS ? PICKUP_LOCATIONS[key as PickupLocationKey] : null;
}

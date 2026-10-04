/** Pickup point as returned by /api/points. `id` is the carrier's own code (e.g. "KAL06M"). */
export type PickupPoint = {
  id: string;
  name: string;
  address: string;
  /** Where exactly the point is, e.g. "w sklepie Żabka" — null when the carrier gives none. */
  description: string | null;
  lat: number;
  lon: number;
};

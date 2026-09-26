import type { PointService } from "./shipping";

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

/** epaka.pl courier ids (GET https://api.epaka.pl/v1/couriers). */
export const EPAKA_COURIER_IDS: Record<PointService, number> = {
  inpost: 6,
  orlen: 11,
};

export function isPointService(value: string | null): value is PointService {
  return value !== null && value in EPAKA_COURIER_IDS;
}

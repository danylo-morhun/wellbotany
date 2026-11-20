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

/** Same code ignoring case, spaces and leading zeros (FedEx shows "048906" for id "48906"). */
export function isSamePointCode(id: string, query: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\s+/g, "")
      .toUpperCase()
      .replace(/^0+(?=\d)/, "");
  return norm(id) === norm(query);
}

/** epaka finds FedEx points by the 6-digit code in their name, not by the shorter id. */
export function epakaPointQuery(service: string, query: string): string {
  return service === "FEDEX_POINT" && /^\d{1,5}$/.test(query) ? query.padStart(6, "0") : query;
}

/** Puts the point whose code is the query first, so a code search lands on it. */
export function exactCodeFirst<T extends { id: string }>(points: T[], query: string): T[] {
  const i = points.findIndex((p) => isSamePointCode(p.id, query));
  return i <= 0 ? points : [points[i], ...points.slice(0, i), ...points.slice(i + 1)];
}

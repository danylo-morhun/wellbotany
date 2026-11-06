// Last stock levels the DB accepted per location, kept in Redis so a snapshot
// that changes nothing is answered without waking Postgres (Neon Free bills
// every wake-up). Postgres stays the source of truth: the cache is dropped
// before every write and rebuilt after it commits, so a failed write leaves
// no cache rather than a wrong one.
import { redis } from "@/lib/redis";

type Stored = { verifiedAt: string; levels: Record<string, number> };

export type CachedLevels = { verifiedAt: Date; levels: Map<string, number> };

export const levelsKey = (code: string) => `stock-sync:levels:${code}`;
// When web orders Subiekt hasn't seen last changed. Online stock holds them
// back, so a change (new, paid, cancelled, entered in Subiekt) needs a
// recompute even when Subiekt's levels stay put — the next full does it.
const ORDERS_CHANGED_KEY = "stock-sync:orders-changed-at";

export async function readLevels(code: string): Promise<CachedLevels | null> {
  if (!redis) return null;
  try {
    const [stored, ordersChangedAt] = await redis.mget<[Stored | null, string | null]>(
      levelsKey(code),
      ORDERS_CHANGED_KEY,
    );
    if (!stored?.levels || !stored.verifiedAt) return null;
    const verifiedAt = new Date(stored.verifiedAt);
    return {
      // An order change since the last check voids it
      verifiedAt:
        ordersChangedAt && new Date(ordersChangedAt) > verifiedAt ? new Date(0) : verifiedAt,
      levels: new Map(Object.entries(stored.levels)),
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

// A Redis outage must not stop the sync: if the drop fails the write goes on
// (reads fail too while Redis is down, so the stale entry is rarely used, and
// the daily full against Postgres settles it).
export async function dropLevels(code: string): Promise<void> {
  await redis?.del(levelsKey(code)).catch(console.error);
}

export async function writeLevels(code: string, value: CachedLevels): Promise<void> {
  if (!redis) return;
  const stored: Stored = {
    verifiedAt: value.verifiedAt.toISOString(),
    levels: Object.fromEntries(value.levels),
  };
  await redis.set(levelsKey(code), stored).catch(console.error);
}

/** Call wherever SUBIEKT_ORDERS_TAG is revalidated. */
export async function noteOrdersChanged(): Promise<void> {
  await redis?.set(ORDERS_CHANGED_KEY, new Date().toISOString()).catch(console.error);
}

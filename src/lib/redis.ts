import Redis from "ioredis";

// Redis on the VPS (localhost). Values are stored as JSON so callers get back
// what they set. Every call fails fast when Redis is down: callers treat it as
// a cache / limiter and carry on without it.

type Client = {
  get<T>(key: string): Promise<T | null>;
  mget<T extends unknown[]>(...keys: string[]): Promise<T>;
  set(key: string, value: unknown): Promise<"OK" | null>;
  del(...keys: string[]): Promise<number>;
  /** INCR, starting a `ttlMs` expiry when the key is new. Returns the new count. */
  incrWindow(key: string, ttlMs: number): Promise<number>;
};

const parse = (raw: string | null) => {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

function connect(url: string): Client {
  const io = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    // Don't queue commands while disconnected — fail at once instead
    enableOfflineQueue: false,
  });
  io.on("error", (e) => console.error("redis:", e.message));
  // lazyConnect + no offline queue: connect up front, commands fail until it's up
  io.connect().catch(() => {});

  return {
    get: async (key) => parse(await io.get(key)),
    mget: async (...keys) => (await io.mget(...keys)).map(parse) as never,
    set: (key, value) => io.set(key, JSON.stringify(value)),
    del: (...keys) => io.del(...keys),
    incrWindow: async (key, ttlMs) => {
      const res = await io.multi().incr(key).pexpire(key, ttlMs, "NX").exec();
      const [err, count] = res?.[0] ?? [new Error("redis: empty reply"), 0];
      if (err) throw err;
      return Number(count);
    },
  };
}

const globalForRedis = globalThis as unknown as { redis?: Client | null };

/** null when REDIS_URL is unset — e.g. tests and CI. */
export const redis: Client | null =
  globalForRedis.redis ?? (process.env.REDIS_URL ? connect(process.env.REDIS_URL) : null);

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

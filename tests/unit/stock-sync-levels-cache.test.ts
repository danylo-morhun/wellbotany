import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, unknown>();
vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    mget: vi.fn(async (...keys: string[]) => keys.map((k) => store.get(k) ?? null)),
    set: vi.fn(async (k: string, v: unknown) => {
      store.set(k, v);
      return "OK";
    }),
    del: vi.fn(async (k: string) => Number(store.delete(k))),
  },
}));

const { dropLevels, levelsKey, noteOrdersChanged, readLevels, writeLevels } = await import(
  "@/features/stock-sync/lib/levels-cache"
);

beforeEach(() => {
  store.clear();
  vi.useRealTimers();
});

describe("levels cache", () => {
  it("round-trips levels and when they were checked", async () => {
    const verifiedAt = new Date("2026-11-06T08:00:00Z");
    await writeLevels("sklep1", { verifiedAt, levels: new Map([["v1", 3]]) });
    expect(await readLevels("sklep1")).toEqual({ verifiedAt, levels: new Map([["v1", 3]]) });
    expect(await readLevels("other")).toBeNull();
  });

  it("is gone after a drop", async () => {
    await writeLevels("sklep1", { verifiedAt: new Date(), levels: new Map() });
    await dropLevels("sklep1");
    expect(store.has(levelsKey("sklep1"))).toBe(false);
    expect(await readLevels("sklep1")).toBeNull();
  });

  it("an order change since the last check voids the check, not the levels", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-06T08:00:00Z") });
    await writeLevels("sklep1", { verifiedAt: new Date(), levels: new Map([["v1", 3]]) });
    vi.setSystemTime(new Date("2026-11-06T09:00:00Z"));
    await noteOrdersChanged();
    expect(await readLevels("sklep1")).toEqual({
      verifiedAt: new Date(0),
      levels: new Map([["v1", 3]]),
    });
  });

  it("an order change before the last check leaves it", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-06T08:00:00Z") });
    await noteOrdersChanged();
    vi.setSystemTime(new Date("2026-11-06T09:00:00Z"));
    await writeLevels("sklep1", { verifiedAt: new Date(), levels: new Map() });
    expect((await readLevels("sklep1"))?.verifiedAt).toEqual(new Date("2026-11-06T09:00:00Z"));
  });
});

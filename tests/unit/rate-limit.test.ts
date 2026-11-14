import { describe, expect, it, vi } from "vitest";

const counts = new Map<string, number>();
const incrWindow = vi.fn(async (key: string, _ttlMs: number) => {
  counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts.get(key) ?? 0;
});
vi.mock("@/lib/redis", () => ({ redis: { incrWindow } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { assertNotRateLimited, loginLimiter } = await import("@/lib/rate-limit");

describe("rate limit", () => {
  it("allows up to the limit per identifier, then refuses", async () => {
    for (let i = 0; i < 10; i++) await assertNotRateLimited(loginLimiter, "1.2.3.4");
    await expect(assertNotRateLimited(loginLimiter, "1.2.3.4")).rejects.toThrow(/Zbyt wiele/);
    await expect(assertNotRateLimited(loginLimiter, "5.6.7.8")).resolves.toBeUndefined();
    expect(incrWindow).toHaveBeenCalledWith("ratelimit:login:1.2.3.4", 60_000);
  });

  it("lets requests through when Redis fails", async () => {
    incrWindow.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(assertNotRateLimited(loginLimiter, "9.9.9.9")).resolves.toBeUndefined();
  });
});

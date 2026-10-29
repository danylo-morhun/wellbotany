import { beforeEach, describe, expect, it, vi } from "vitest";

const applySnapshot = vi.fn();
const redisSet = vi.fn();
const revalidateTag = vi.fn();

vi.mock("@/features/stock-sync/lib/apply", () => ({ applySnapshot }));
vi.mock("@/features/stock-sync/lib/signature", () => ({ authenticate: () => "sklep1" }));
vi.mock("@/lib/redis", () => ({ redis: { set: redisSet } }));
vi.mock("@/lib/merchant", () => ({ syncProductsToMerchant: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag }));

const { POST } = await import("@/app/api/sync/subiekt/stock/route");

function post(body: unknown) {
  return POST(
    new Request("https://wellbotany.pl/api/sync/subiekt/stock", {
      method: "POST",
      body: JSON.stringify(body),
    }) as never,
  );
}

beforeEach(() => {
  applySnapshot.mockReset();
  revalidateTag.mockReset();
  redisSet.mockReset().mockResolvedValue("OK");
});

describe("POST /api/sync/subiekt/stock", () => {
  it("answers an empty delta from Redis without touching the DB", async () => {
    const res = await post({ mode: "delta", items: [] });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, changedVariants: 0 });
    expect(applySnapshot).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledWith("stock-sync:heartbeat:sklep1", expect.any(String));
  });

  it("still answers the heartbeat when Redis fails", async () => {
    redisSet.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await post({ mode: "delta", items: [] });

    expect(res.status).toBe(200);
    expect(applySnapshot).not.toHaveBeenCalled();
  });

  it("applies a delta with items and an empty full snapshot", async () => {
    applySnapshot.mockResolvedValue({
      ok: true,
      changedLevels: 0,
      changedVariants: 0,
      unmatched: 0,
      restockedOrSoldOut: [],
      changedProductSlugs: [],
    });

    await post({ mode: "delta", items: [{ symbol: "A1", quantity: 3 }] });
    await post({ mode: "full", items: [] });

    expect(applySnapshot).toHaveBeenCalledTimes(2);
    expect(redisSet).not.toHaveBeenCalled();
  });

  it("refreshes only the pages of products whose stock count moved", async () => {
    applySnapshot.mockResolvedValue({
      ok: true,
      changedLevels: 2,
      changedVariants: 2,
      unmatched: 0,
      restockedOrSoldOut: [],
      changedProductSlugs: ["magnez", "witamina-d3"],
    });

    const res = await post({ mode: "delta", items: [{ symbol: "A1", quantity: 3 }] });

    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual([
      "product:magnez",
      "product:witamina-d3",
    ]);
    expect(await res.json()).not.toHaveProperty("changedProductSlugs");
  });

  it("refreshes the whole catalog when a product sold out or came back", async () => {
    applySnapshot.mockResolvedValue({
      ok: true,
      changedLevels: 1,
      changedVariants: 1,
      unmatched: 0,
      restockedOrSoldOut: ["p1"],
      changedProductSlugs: ["magnez"],
    });

    await post({ mode: "delta", items: [{ symbol: "A1", quantity: 0 }] });

    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual(["products"]);
  });
});

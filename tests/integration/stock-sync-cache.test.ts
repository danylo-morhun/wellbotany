import { NextRequest } from "next/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { placeOrder } from "@/features/checkout/actions";
import { signSnapshot } from "@/features/stock-sync/lib/signature";
import type { StockSnapshot } from "@/features/stock-sync/schema";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant, RUN_ID } from "../helpers/seed";

// An in-memory stand-in for Upstash, so the levels cache is on
const store = new Map<string, unknown>();
vi.mock("@/lib/redis", () => ({
  redis: {
    get: async (k: string) => store.get(k) ?? null,
    mget: async (...keys: string[]) => keys.map((k) => store.get(k) ?? null),
    set: async (k: string, v: unknown) => {
      store.set(k, v);
      return "OK";
    },
    del: async (k: string) => Number(store.delete(k)),
  },
}));

// The fake Redis would switch the checkout rate limiter on — keep it off as in other tests
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  assertNotRateLimited: async () => {},
}));

const { POST } = await import("@/app/api/sync/subiekt/stock/route");
const { markEnteredInSubiekt } = await import("@/features/stock-sync/lib/orders");

const CODE = `c${RUN_ID}`;
const SECRET = "test-secret";
process.env[`SUBIEKT_SYNC_SECRET_${CODE.toUpperCase()}`] = SECRET;

const productIds: string[] = [];
const cartIds: string[] = [];
const orderNumbers: string[] = [];

afterAll(async () => {
  await prisma.stockLocation.deleteMany({ where: { code: CODE } });
  await prisma.order.deleteMany({ where: { orderNumber: { in: orderNumbers } } });
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
});

async function post(snapshot: StockSnapshot) {
  const body = JSON.stringify(snapshot);
  const ts = String(Date.now());
  const res = await POST(
    new NextRequest("http://localhost/api/sync/subiekt/stock", {
      method: "POST",
      body,
      headers: {
        "x-sync-location": CODE,
        "x-sync-timestamp": ts,
        "x-sync-signature": signSnapshot(SECRET, ts, body),
      },
    }),
  );
  expect(res.status).toBe(200);
  return res.json();
}

const runs = () => prisma.syncRun.count({ where: { location: { code: CODE } } });
const stockOf = async (id: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;

describe("stock sync with the Redis levels cache", () => {
  it("answers unchanged snapshots from Redis until an order changes", {
    timeout: 60_000,
  }, async () => {
    const { product, variant } = await makeVariant(0);
    productIds.push(product.id);
    const full: StockSnapshot = { mode: "full", items: [{ symbol: variant.sku, quantity: 5 }] };

    expect(await post(full)).toMatchObject({ changedLevels: 1 });
    expect(await runs()).toBe(1);
    expect(await stockOf(variant.id)).toBe(4); // safety stock 1

    // Same numbers again: no SyncRun, so Postgres wasn't written (or read)
    expect(await post(full)).toMatchObject({ changedLevels: 0 });
    expect(await post({ mode: "delta", items: full.items })).toMatchObject({ changedLevels: 0 });
    expect(await runs()).toBe(1);

    // A web order holds 2 back; staff enter it in Subiekt before Subiekt's count moves
    const cart = await makeCart(variant.id, 2);
    cartIds.push(cart.id);
    const placed = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });
    expect(placed.serverError).toBeUndefined();
    const orderNumber = placed.data?.orderNumber ?? "";
    orderNumbers.push(orderNumber);
    expect(await stockOf(variant.id)).toBe(2);
    await markEnteredInSubiekt([orderNumber]);

    // Levels unchanged, but the order change forces the next full through Postgres
    await post(full);
    expect(await runs()).toBe(2);
    expect(await stockOf(variant.id)).toBe(4);

    // ...after which it is skipped again
    await post(full);
    expect(await runs()).toBe(2);

    // A real change still goes through
    expect(
      await post({ mode: "delta", items: [{ symbol: variant.sku, quantity: 3 }] }),
    ).toMatchObject({ changedLevels: 1 });
    expect(await stockOf(variant.id)).toBe(2);
    expect(await runs()).toBe(3);
  });
});

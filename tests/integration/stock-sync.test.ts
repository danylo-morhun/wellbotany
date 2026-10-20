import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/sync/subiekt/stock/route";
import { placeOrder } from "@/features/checkout/actions";
import { signSnapshot } from "@/features/stock-sync/lib/signature";
import type { StockSnapshot } from "@/features/stock-sync/schema";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant, RUN_ID } from "../helpers/seed";

const CODE = `t${RUN_ID}`;
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

function post(snapshot: StockSnapshot, secret = SECRET) {
  const body = JSON.stringify(snapshot);
  const ts = String(Date.now());
  return POST(
    new NextRequest("http://localhost/api/sync/subiekt/stock", {
      method: "POST",
      body,
      headers: {
        "x-sync-location": CODE,
        "x-sync-timestamp": ts,
        "x-sync-signature": signSnapshot(secret, ts, body),
      },
    }),
  );
}

async function variant(stock: number, ean?: string) {
  const { product, variant } = await makeVariant(stock);
  productIds.push(product.id);
  if (!ean) return variant;
  return prisma.productVariant.update({ where: { id: variant.id }, data: { ean } });
}

const stockOf = async (id: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;

describe("POST /api/sync/subiekt/stock", () => {
  it("refuses a request signed with the wrong secret", async () => {
    const res = await post({ mode: "delta", items: [] }, "wrong");
    expect(res.status).toBe(401);
  });

  it("sets stock from Subiekt, holds back web orders Subiekt hasn't seen", async () => {
    const ean = `59${Date.now()}`.slice(0, 13);
    const a = await variant(0, ean);
    const b = await variant(0);

    const full = await post({
      mode: "full",
      agentVersion: "test",
      items: [
        { symbol: "SUBIEKT-A", ean, quantity: 5 }, // matched by EAN
        { symbol: b.sku, quantity: 3 }, // matched by symbol
        { symbol: `UNKNOWN-${RUN_ID}`, quantity: 1 },
      ],
    });
    expect(full.status).toBe(200);
    expect(await full.json()).toMatchObject({ ok: true, changedLevels: 2, unmatched: 1 });
    // safety stock 1 per location
    expect(await stockOf(a.id)).toBe(4);
    expect(await stockOf(b.id)).toBe(2);

    const cart = await makeCart(a.id, 2);
    cartIds.push(cart.id);
    const placed = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });
    expect(placed.serverError).toBeUndefined();
    const orderNumber = placed.data?.orderNumber ?? "";
    orderNumbers.push(orderNumber);
    expect(await stockOf(a.id)).toBe(2);

    // Subiekt still shows 5 — the next sync must not give the 2 sold units back
    await post({
      mode: "full",
      items: [
        { symbol: "SUBIEKT-A", ean, quantity: 5 },
        { symbol: b.sku, quantity: 3 },
      ],
    });
    expect(await stockOf(a.id)).toBe(2);

    // Staff enter the order in Subiekt: its stock drops, the order stops counting
    await prisma.order.update({ where: { orderNumber }, data: { subiektEnteredAt: new Date() } });
    await post({ mode: "delta", items: [{ symbol: "SUBIEKT-A", ean, quantity: 3 }] });
    expect(await stockOf(a.id)).toBe(2);

    const runs = await prisma.syncRun.count({ where: { location: { code: CODE }, error: null } });
    expect(runs).toBe(3);
  });
});

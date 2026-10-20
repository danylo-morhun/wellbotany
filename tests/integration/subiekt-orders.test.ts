import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { POST as postEntered } from "@/app/api/sync/subiekt/orders/entered/route";
import { GET as getOrders } from "@/app/api/sync/subiekt/orders/route";
import { placeOrder } from "@/features/checkout/actions";
import type { SubiektOrder } from "@/features/stock-sync/lib/orders";
import { signSnapshot } from "@/features/stock-sync/lib/signature";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant, RUN_ID } from "../helpers/seed";

const CODE = `o${RUN_ID}`;
const SECRET = "test-secret";
process.env[`SUBIEKT_SYNC_SECRET_${CODE.toUpperCase()}`] = SECRET;

const productIds: string[] = [];
const cartIds: string[] = [];
const orderNumbers: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({ where: { orderNumber: { in: orderNumbers } } });
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
});

function signed(url: string, method: "GET" | "POST", body = "", secret = SECRET) {
  const ts = String(Date.now());
  return new NextRequest(url, {
    method,
    ...(method === "POST" && { body }),
    headers: {
      "x-sync-location": CODE,
      "x-sync-timestamp": ts,
      "x-sync-signature": signSnapshot(secret, ts, body),
    },
  });
}

async function pending(): Promise<SubiektOrder[]> {
  const res = await getOrders(signed("http://localhost/api/sync/subiekt/orders", "GET"));
  expect(res.status).toBe(200);
  return (await res.json()).orders;
}

describe("Subiekt order endpoints", () => {
  it("refuses unsigned requests", async () => {
    const res = await getOrders(signed("http://localhost/api/sync/subiekt/orders", "GET", "", "x"));
    expect(res.status).toBe(401);
  });

  it("lists a placed order until the agent reports it entered", async () => {
    const { product, variant } = await makeVariant(10, 2990);
    productIds.push(product.id);
    const ean = `59${Date.now()}`.slice(0, 13);
    await prisma.productVariant.update({ where: { id: variant.id }, data: { ean } });
    const cart = await makeCart(variant.id, 2);
    cartIds.push(cart.id);
    const placed = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });
    const orderNumber = placed.data?.orderNumber ?? "";
    orderNumbers.push(orderNumber);

    const order = (await pending()).find((o) => o.orderNumber === orderNumber);
    expect(order).toMatchObject({
      paid: false,
      customer: { email: baseCheckoutInput.email },
      items: [
        { sku: variant.sku, ean, quantity: 2, unitPricePln: 2990, totalPln: 5980, vatRate: 23 },
      ],
    });

    const body = JSON.stringify({ orderNumbers: [orderNumber] });
    const res = await postEntered(
      signed("http://localhost/api/sync/subiekt/orders/entered", "POST", body),
    );
    expect(await res.json()).toEqual({ ok: true, updated: 1 });
    expect((await pending()).some((o) => o.orderNumber === orderNumber)).toBe(false);

    // Reporting it again is harmless
    const again = await postEntered(
      signed("http://localhost/api/sync/subiekt/orders/entered", "POST", body),
    );
    expect(await again.json()).toEqual({ ok: true, updated: 0 });
  });
});

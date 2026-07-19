import { afterAll, describe, expect, it } from "vitest";
import { placeOrder } from "@/features/checkout/actions";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant } from "../helpers/seed";

const productIds: string[] = [];
const cartIds: string[] = [];
const orderNumbers: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({ where: { orderNumber: { in: orderNumbers } } });
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
});

describe("placeOrder", () => {
  it("creates an order, decrements stock, and clears the cart", async () => {
    const { product, variant } = await makeVariant(10);
    productIds.push(product.id);
    const cart = await makeCart(variant.id, 3);
    cartIds.push(cart.id);

    const result = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });

    expect(result.serverError).toBeUndefined();
    expect(result.data?.orderNumber).toMatch(/^TZ-\d{4}-\d{5}$/);
    if (result.data) orderNumbers.push(result.data.orderNumber);

    const updatedVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(updatedVariant.stock).toBe(7);

    const cartAfter = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: true },
    });
    expect(cartAfter?.items).toHaveLength(0);
  });

  it("rejects when requested quantity exceeds stock, without touching stock", async () => {
    const { product, variant } = await makeVariant(2);
    productIds.push(product.id);
    const cart = await makeCart(variant.id, 5);
    cartIds.push(cart.id);

    const result = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toMatch(/niedostępny/i);

    const unchangedVariant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(unchangedVariant.stock).toBe(2);
  });

  it("rejects an empty cart", async () => {
    const cart = await prisma.cart.create({ data: {} });
    cartIds.push(cart.id);

    const result = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toMatch(/pusty/i);
  });

  it("rejects a non-existent cart id", async () => {
    const result = await placeOrder({ ...baseCheckoutInput, cartId: "does-not-exist" });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toMatch(/pusty/i);
  });
});

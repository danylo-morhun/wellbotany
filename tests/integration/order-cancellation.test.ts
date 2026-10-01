import type { OrderStatus } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { placeOrder } from "@/features/checkout/actions";
import { syncCancellation } from "@/features/orders/lib/cancellation";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant, RUN_ID } from "../helpers/seed";

const productIds: string[] = [];
const cartIds: string[] = [];
const couponIds: string[] = [];
const orderNumbers: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({ where: { orderNumber: { in: orderNumbers } } });
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.coupon.deleteMany({ where: { id: { in: couponIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
});

/** Places a real order for 3 pcs (stock 10 → 7) with a single-use coupon */
async function orderWithCoupon(suffix: string) {
  const coupon = await prisma.coupon.create({
    data: {
      code: `CANCEL-${suffix}-${RUN_ID}`.toUpperCase(),
      type: "FIXED_AMOUNT",
      value: 500,
      maxUsages: 1,
      isActive: true,
    },
  });
  couponIds.push(coupon.id);
  const { product, variant } = await makeVariant(10);
  productIds.push(product.id);
  const cart = await makeCart(variant.id, 3);
  cartIds.push(cart.id);

  const result = await placeOrder({
    ...baseCheckoutInput,
    cartId: cart.id,
    couponCode: coupon.code,
  });
  expect(result.serverError).toBeUndefined();
  const orderNumber = result.data?.orderNumber ?? "";
  orderNumbers.push(orderNumber);
  const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber } });
  return { order, variant, coupon };
}

const move = (orderId: string, from: OrderStatus, to: OrderStatus) =>
  prisma.$transaction((tx) => syncCancellation(tx, orderId, from, to));
const stockOf = async (id: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { id } })).stock;
const usesOf = async (id: string) =>
  (await prisma.coupon.findUniqueOrThrow({ where: { id } })).usageCount;

describe("syncCancellation", () => {
  it("cancelling returns stock and frees the coupon; restoring takes both again", async () => {
    const { order, variant, coupon } = await orderWithCoupon("a");
    expect(await stockOf(variant.id)).toBe(7);
    expect(await usesOf(coupon.id)).toBe(1);

    expect(await move(order.id, order.status, "CANCELLED")).toBe(true);
    expect(await stockOf(variant.id)).toBe(10);
    expect(await usesOf(coupon.id)).toBe(0);

    expect(await move(order.id, "CANCELLED", "PROCESSING")).toBe(true);
    expect(await stockOf(variant.id)).toBe(7);
    expect(await usesOf(coupon.id)).toBe(1);
  });

  it("does nothing for transitions that don't enter or leave CANCELLED", async () => {
    const { order, variant, coupon } = await orderWithCoupon("b");
    for (const [from, to] of [
      [order.status, "PAID"],
      ["PAID", "SHIPPED"],
      ["SHIPPED", "REFUNDED"],
      ["CANCELLED", "CANCELLED"],
    ] as [OrderStatus, OrderStatus][]) {
      expect(await move(order.id, from, to)).toBe(false);
    }
    expect(await stockOf(variant.id)).toBe(7);
    expect(await usesOf(coupon.id)).toBe(1);
  });

  it("refuses to restore an order when the stock is gone, changing nothing", async () => {
    const { order, variant, coupon } = await orderWithCoupon("c");
    await move(order.id, order.status, "CANCELLED");
    await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: 1 } });

    await expect(move(order.id, "CANCELLED", "PROCESSING")).rejects.toThrow(/Za mało towaru/);
    expect(await stockOf(variant.id)).toBe(1);
    expect(await usesOf(coupon.id)).toBe(0);
  });
});

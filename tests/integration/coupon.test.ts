import { afterAll, describe, expect, it, vi } from "vitest";
import { placeOrder, verifyCoupon } from "@/features/checkout/actions";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant, RUN_ID } from "../helpers/seed";

// placeOrder only accepts the caller's own cart, and a customer has one cart:
// the concurrent pair is a guest cart (cookie) + the logged-in customer's cart
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/lib/auth", () => ({
  auth: async () => (session.userId ? { user: { id: session.userId } } : null),
}));

const customerIds: string[] = [];
const productIds: string[] = [];
const cartIds: string[] = [];
const orderNumbers: string[] = [];
const couponIds: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({ where: { orderNumber: { in: orderNumbers } } });
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.coupon.deleteMany({ where: { id: { in: couponIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
});

describe("verifyCoupon", () => {
  it("rejects an unknown code", async () => {
    const result = await verifyCoupon({ code: `NOPE-${RUN_ID}`.toUpperCase(), subtotal: 10000 });
    expect(result.data?.valid).toBe(false);
  });

  it("rejects when subtotal is below the coupon's minimum order", async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `MIN-${RUN_ID}`.toUpperCase(),
        type: "FIXED_AMOUNT",
        value: 1000,
        minOrderPln: 10000,
        isActive: true,
      },
    });
    couponIds.push(coupon.id);

    const result = await verifyCoupon({ code: coupon.code, subtotal: 5000 });
    expect(result.data?.valid).toBe(false);
    expect(result.data?.message).toMatch(/minimalna/i);
  });

  it("accepts a valid percentage coupon and computes the discount", async () => {
    const coupon = await prisma.coupon.create({
      data: { code: `PCT-${RUN_ID}`.toUpperCase(), type: "PERCENTAGE", value: 10, isActive: true },
    });
    couponIds.push(coupon.id);

    const result = await verifyCoupon({ code: coupon.code, subtotal: 10000 });
    expect(result.data?.valid).toBe(true);
    expect(result.data?.discountPln).toBe(1000);
  });
});

describe("placeOrder — coupon usage race", () => {
  it("allows only one concurrent order to consume a single-use coupon", async () => {
    const coupon = await prisma.coupon.create({
      data: {
        code: `RACE-${RUN_ID}`.toUpperCase(),
        type: "FIXED_AMOUNT",
        value: 500,
        maxUsages: 1,
        isActive: true,
      },
    });
    couponIds.push(coupon.id);

    const { product: p1, variant: v1 } = await makeVariant(10);
    const { product: p2, variant: v2 } = await makeVariant(10);
    productIds.push(p1.id, p2.id);
    const customer = await prisma.customer.create({
      data: { email: `race-${RUN_ID}@example.com`, firstName: "Jan", lastName: "Testowy" },
    });
    customerIds.push(customer.id);
    session.userId = customer.id;
    const cart1 = await makeCart(v1.id, 1);
    const cart2 = await makeCart(v2.id, 1, customer.id);
    cartIds.push(cart1.id, cart2.id);

    const [r1, r2] = await Promise.all([
      placeOrder({ ...baseCheckoutInput, cartId: cart1.id, couponCode: coupon.code }),
      placeOrder({ ...baseCheckoutInput, cartId: cart2.id, couponCode: coupon.code }),
    ]);

    for (const r of [r1, r2]) {
      if (r.data) orderNumbers.push(r.data.orderNumber);
    }

    const succeeded = [r1, r2].filter((r) => r.data);
    const failed = [r1, r2].filter((r) => r.serverError);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.serverError).toMatch(/wyczerpany/i);

    const finalCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(finalCoupon.usageCount).toBe(1);
  });
});

describe("placeOrder — coupon and sale items", () => {
  it("discounts only full-price lines when the coupon doesn't stack", async () => {
    session.userId = null;
    const coupon = await prisma.coupon.create({
      data: { code: `NOSTACK-${RUN_ID}`.toUpperCase(), type: "PERCENTAGE", value: 10 },
    });
    couponIds.push(coupon.id);

    const { product: sale, variant: saleVariant } = await makeVariant(10, 5000);
    const { product: full, variant: fullVariant } = await makeVariant(10, 3000);
    productIds.push(sale.id, full.id);
    // Price cut with a "was" price — the DB trigger freezes the 30-day low (50 zł)
    await prisma.productVariant.update({
      where: { id: saleVariant.id },
      data: { pricePln: 4000, comparePricePln: 5000 },
    });

    const cart = await makeCart(saleVariant.id, 1);
    await prisma.cartItem.create({
      data: { cartId: cart.id, variantId: fullVariant.id, quantity: 1 },
    });
    cartIds.push(cart.id);

    const result = await placeOrder({
      ...baseCheckoutInput,
      cartId: cart.id,
      couponCode: coupon.code,
    });
    expect(result.serverError).toBeUndefined();
    if (result.data) orderNumbers.push(result.data.orderNumber);

    const order = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: result.data?.orderNumber },
    });
    // 10% of the 30 zł full-price line only
    expect(order.discountPln).toBe(300);
  });

  it("rejects the code when every line is on sale", async () => {
    session.userId = null;
    const coupon = await prisma.coupon.create({
      data: { code: `ALLSALE-${RUN_ID}`.toUpperCase(), type: "PERCENTAGE", value: 10 },
    });
    couponIds.push(coupon.id);
    const { product, variant } = await makeVariant(10, 5000);
    productIds.push(product.id);
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { pricePln: 4000, comparePricePln: 5000 },
    });
    const cart = await makeCart(variant.id, 1);
    cartIds.push(cart.id);

    const result = await placeOrder({
      ...baseCheckoutInput,
      cartId: cart.id,
      couponCode: coupon.code,
    });
    expect(result.serverError).toMatch(/nie łączy się z promocjami/);
    const unused = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    expect(unused.usageCount).toBe(0);
  });
});

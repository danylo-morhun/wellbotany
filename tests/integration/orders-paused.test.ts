import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { addToCart } from "@/features/cart/actions";
import { placeOrder } from "@/features/checkout/actions";
import { prisma } from "@/lib/prisma";
import { baseCheckoutInput, makeCart, makeVariant } from "../helpers/seed";

const productIds: string[] = [];
const cartIds: string[] = [];

// Pause only for this file — flipping the shared settings row would leak
// into other test files running in parallel
beforeAll(() => {
  vi.spyOn(prisma.shopSettings, "findUnique").mockResolvedValue({
    id: 1,
    freeShippingThresholdPln: 20000,
    productMetaSuffixPl: null,
    ordersPaused: true,
    ordersPausedMessagePl: "Wracamy 3 listopada.",
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
});

describe("orders paused", () => {
  it("rejects adding to the cart with the pause message", async () => {
    const { product, variant } = await makeVariant(10);
    productIds.push(product.id);

    const result = await addToCart({ variantId: variant.id, quantity: 1 });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBe("Wracamy 3 listopada.");
  });

  it("rejects placing an order without touching stock", async () => {
    const { product, variant } = await makeVariant(10);
    productIds.push(product.id);
    const cart = await makeCart(variant.id, 2);
    cartIds.push(cart.id);

    const result = await placeOrder({ ...baseCheckoutInput, cartId: cart.id });

    expect(result.data).toBeUndefined();
    expect(result.serverError).toBe("Wracamy 3 listopada.");
    const unchanged = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(unchanged.stock).toBe(10);
  });
});

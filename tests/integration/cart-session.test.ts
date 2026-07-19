import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { cookieStore, resetRequestState } from "../mocks/next-headers";

// Overrides the global setup.ts stub (which forces auth() -> null for every
// test) so the logged-in-customer path through ensureCartId can be exercised
// here without affecting other test files.
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: vi.fn(async () => null as { user: { id: string } } | null),
}));
vi.mock("@/lib/auth", () => ({ auth: mockAuth }));

import { CART_COOKIE_NAME, ensureCartId } from "@/features/cart/lib/session";

const customerIds: string[] = [];
const cartIds: string[] = [];

afterEach(() => {
  resetRequestState();
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(null);
});

afterAll(async () => {
  await prisma.cart.deleteMany({ where: { id: { in: cartIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
});

describe("ensureCartId — logged-in customer", () => {
  it("creates a cart tied to customerId when none exists yet", async () => {
    const customer = await prisma.customer.create({
      data: { email: `cust-${Date.now()}-1@test.pl` },
    });
    customerIds.push(customer.id);
    mockAuth.mockResolvedValue({ user: { id: customer.id } });

    const cartId = await ensureCartId();
    cartIds.push(cartId);

    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: cartId } });
    expect(cart.customerId).toBe(customer.id);
  });

  it("reuses the existing cart for the same customer instead of creating a new one", async () => {
    const customer = await prisma.customer.create({
      data: { email: `cust-${Date.now()}-2@test.pl` },
    });
    customerIds.push(customer.id);
    mockAuth.mockResolvedValue({ user: { id: customer.id } });

    const first = await ensureCartId();
    cartIds.push(first);
    const second = await ensureCartId();

    expect(second).toBe(first);
  });
});

describe("ensureCartId — guest", () => {
  it("creates a cookie-based cart with an expiresAt TTL when there is no cart cookie", async () => {
    const cartId = await ensureCartId();
    cartIds.push(cartId);

    expect(cookieStore.get(CART_COOKIE_NAME)).toBe(cartId);
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: cartId } });
    expect(cart.customerId).toBeNull();
    expect(cart.expiresAt).not.toBeNull();
  });

  it("reuses the cart referenced by a valid, non-expired cart cookie", async () => {
    const first = await ensureCartId();
    cartIds.push(first);

    const second = await ensureCartId();

    expect(second).toBe(first);
  });

  it("ignores an expired cart cookie and creates a fresh guest cart instead", async () => {
    const expiredCart = await prisma.cart.create({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    cartIds.push(expiredCart.id);
    cookieStore.set(CART_COOKIE_NAME, expiredCart.id);

    const cartId = await ensureCartId();
    cartIds.push(cartId);

    expect(cartId).not.toBe(expiredCart.id);
    expect(cookieStore.get(CART_COOKIE_NAME)).toBe(cartId);
  });

  it("ignores a cart cookie pointing at a non-existent cart id", async () => {
    cookieStore.set(CART_COOKIE_NAME, "does-not-exist");

    const cartId = await ensureCartId();
    cartIds.push(cartId);

    expect(cartId).not.toBe("does-not-exist");
  });
});

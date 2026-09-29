import { CART_COOKIE_NAME } from "@/features/cart/lib/session";
import { prisma } from "@/lib/prisma";
import { cookieStore } from "../mocks/next-headers";

// Local .env / .env.local point at production and these tests write orders and
// carts — require an explicit, non-production DATABASE_URL.
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("ep-lingering-cake")) {
  throw new Error("integration tests: pass a non-production DATABASE_URL explicitly");
}

export const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${RUN_ID}-${counter}`;
}

export async function makeVariant(stock: number, pricePln = 5000) {
  const product = await prisma.product.create({
    data: {
      slug: unique("test-product"),
      namePl: "Test Product",
      status: "ACTIVE",
      variants: {
        create: {
          sku: unique("TEST-SKU"),
          pricePln,
          vatRate: 23,
          stock,
        },
      },
    },
    include: { variants: true },
  });
  return { product, variant: product.variants[0] };
}

/** Guest cart owned by the "current request" (its id in the cart cookie), or a customer's cart. */
export async function makeCart(variantId: string, quantity: number, customerId?: string) {
  const cart = await prisma.cart.create({
    data: { customerId, items: { create: { variantId, quantity } } },
  });
  if (!customerId) cookieStore.set(CART_COOKIE_NAME, cart.id);
  return cart;
}

export const baseCheckoutInput = {
  email: "test@example.com",
  phone: "500600700",
  firstName: "Jan",
  lastName: "Testowy",
  street: "Testowa 1",
  city: "Warszawa",
  postalCode: "00-001",
  shippingMethod: "INPOST_KURIER" as const,
  wantsFaktura: false,
  // Online methods are rejected while P24_ENABLED is off (the default)
  paymentMethod: "BANK_TRANSFER" as const,
  acceptedTerms: true,
};

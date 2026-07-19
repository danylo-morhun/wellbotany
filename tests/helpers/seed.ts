import { prisma } from "@/lib/prisma";

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

export async function makeCart(variantId: string, quantity: number) {
  return prisma.cart.create({
    data: { items: { create: { variantId, quantity } } },
  });
}

export const baseCheckoutInput = {
  email: "test@example.com",
  phone: "500600700",
  firstName: "Jan",
  lastName: "Testowy",
  street: "Testowa 1",
  city: "Warszawa",
  postalCode: "00-001",
  shippingMethod: "DHL" as const,
  wantsFaktura: false,
  paymentMethod: "BLIK" as const,
  acceptedTerms: true,
};

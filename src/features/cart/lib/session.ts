import { prisma } from "@/lib/prisma";

export const CART_COOKIE_NAME = "cart_id";
export const CART_TTL_DAYS = 30;

export async function getCart(cartId: string) {
  return prisma.cart.findFirst({
    where: {
      id: cartId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          cartId: true,
          variantId: true,
          quantity: true,
          variant: {
            select: {
              id: true,
              pricePln: true,
              optionLabel: true,
              optionValue: true,
              stock: true,
              product: {
                select: {
                  id: true,
                  slug: true,
                  namePl: true,
                  images: {
                    where: { isMain: true },
                    select: { url: true, altPl: true },
                    take: 1,
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCart>>>;
export type CartItem = CartWithItems["items"][number];

export async function getCartByCustomerId(customerId: string) {
  return prisma.cart.findUnique({
    where: { customerId },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          cartId: true,
          variantId: true,
          quantity: true,
          variant: {
            select: {
              id: true,
              pricePln: true,
              optionLabel: true,
              optionValue: true,
              stock: true,
              product: {
                select: {
                  id: true,
                  slug: true,
                  namePl: true,
                  images: {
                    where: { isMain: true },
                    select: { url: true, altPl: true },
                    take: 1,
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createGuestCart(): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CART_TTL_DAYS);
  const cart = await prisma.cart.create({
    data: { expiresAt },
    select: { id: true },
  });
  return cart.id;
}

export async function mergeGuestCart(guestCartId: string, customerId: string): Promise<void> {
  const [guestCart, customerCart] = await Promise.all([
    prisma.cart.findUnique({
      where: { id: guestCartId },
      select: {
        id: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
            giftSetGroupId: true,
            giftSetId: true,
            giftSetLabel: true,
            unitPriceOverridePln: true,
          },
        },
      },
    }),
    prisma.cart.findUnique({
      where: { customerId },
      select: { id: true },
    }),
  ]);

  if (!guestCart) return;

  if (!customerCart) {
    await prisma.cart.update({
      where: { id: guestCartId },
      data: { customerId, expiresAt: null },
    });
    return;
  }

  for (const item of guestCart.items) {
    await prisma.cartItem.upsert({
      where: {
        cartId_variantId_giftSetGroupId: {
          cartId: customerCart.id,
          variantId: item.variantId,
          giftSetGroupId: item.giftSetGroupId,
        },
      },
      update: { quantity: { increment: item.quantity } },
      create: {
        cartId: customerCart.id,
        variantId: item.variantId,
        quantity: item.quantity,
        giftSetGroupId: item.giftSetGroupId,
        giftSetId: item.giftSetId,
        giftSetLabel: item.giftSetLabel,
        unitPriceOverridePln: item.unitPriceOverridePln,
      },
    });
  }

  await prisma.cart.delete({ where: { id: guestCartId } });
}

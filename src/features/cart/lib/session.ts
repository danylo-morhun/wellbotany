import { cookies } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const CART_COOKIE_NAME = "cart_id";
export const CART_TTL_DAYS = 30;

/** Resolves (creating if needed) the cart id for the current session — logged-in customer cart or guest cookie cart. */
export async function ensureCartId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    const existing = await prisma.cart.findUnique({
      where: { customerId: session.user.id },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.cart.create({
      data: { customerId: session.user.id },
      select: { id: true },
    });
    return created.id;
  }

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE_NAME)?.value;
  if (cartId) {
    const exists = await prisma.cart.findFirst({
      where: { id: cartId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true },
    });
    if (exists) return exists.id;
  }

  const newId = await createGuestCart();
  cookieStore.set(CART_COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  });
  return newId;
}

const cartItemSelect = {
  id: true,
  cartId: true,
  variantId: true,
  quantity: true,
  giftSetGroupId: true,
  giftSetId: true,
  giftSetLabel: true,
  packagingId: true,
  packagingLabel: true,
  giftMessage: true,
  unitPriceOverridePln: true,
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
            orderBy: { sortOrder: "asc" as const },
          },
        },
      },
    },
  },
} as const;

// NavBar's CartIcon and the page body (koszyk/zamowienie) both read the same
// cart in one request — cache() dedupes that to a single query instead of two.
export const getCart = cache(async (cartId: string) => {
  return prisma.cart.findFirst({
    where: {
      id: cartId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      items: { select: cartItemSelect, orderBy: { createdAt: "asc" } },
    },
  });
});

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof getCart>>>;
export type CartItem = CartWithItems["items"][number];

export const getCartByCustomerId = cache(async (customerId: string) => {
  return prisma.cart.findUnique({
    where: { customerId },
    select: {
      id: true,
      items: { select: cartItemSelect, orderBy: { createdAt: "asc" } },
    },
  });
});

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
            packagingId: true,
            packagingLabel: true,
            giftMessage: true,
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
        packagingId: item.packagingId,
        packagingLabel: item.packagingLabel,
        giftMessage: item.giftMessage,
        unitPriceOverridePln: item.unitPriceOverridePln,
      },
    });
  }

  await prisma.cart.delete({ where: { id: guestCartId } });
}

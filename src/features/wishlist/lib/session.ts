import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const WISHLIST_COOKIE_NAME = "wishlist_id";
export const WISHLIST_TTL_DAYS = 30;

// NavBar's WishlistIcon and the PDP's ProductWishlistButton both read the
// same wishlist by the same cookie id in one request — cache() dedupes that
// to a single query instead of two.
export const getWishlist = cache(async (wishlistId: string) => {
  return prisma.wishlist.findFirst({
    where: {
      id: wishlistId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          wishlistId: true,
          productId: true,
          addedAt: true,
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
              brand: {
                select: { name: true, slug: true },
              },
              variants: {
                where: { isDefault: true },
                select: { id: true, pricePln: true, comparePricePln: true, stock: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });
});

export type WishlistWithItems = NonNullable<Awaited<ReturnType<typeof getWishlist>>>;
export type WishlistItem = WishlistWithItems["items"][number];

export async function createGuestWishlist(): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + WISHLIST_TTL_DAYS);
  const wishlist = await prisma.wishlist.create({
    data: { expiresAt },
    select: { id: true },
  });
  return wishlist.id;
}

export async function mergeGuestWishlist(
  guestWishlistId: string,
  customerId: string,
): Promise<void> {
  const [guestWishlist, customerWishlist] = await Promise.all([
    prisma.wishlist.findUnique({
      where: { id: guestWishlistId },
      select: { id: true, items: { select: { productId: true } } },
    }),
    prisma.wishlist.findUnique({
      where: { customerId },
      select: { id: true },
    }),
  ]);

  if (!guestWishlist) return;

  if (!customerWishlist) {
    await prisma.wishlist.update({
      where: { id: guestWishlistId },
      data: { customerId, expiresAt: null },
    });
    return;
  }

  for (const item of guestWishlist.items) {
    await prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: { wishlistId: customerWishlist.id, productId: item.productId },
      },
      update: {},
      create: { wishlistId: customerWishlist.id, productId: item.productId },
    });
  }

  await prisma.wishlist.delete({ where: { id: guestWishlistId } });
}
